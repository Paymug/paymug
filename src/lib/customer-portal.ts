import "server-only";

import { desc, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { featureRecords, orders } from "@/db/schema";
import { parseProductFiles } from "./product-files.utils";
import { getLicenseEntitlementSummary } from "./license-entitlements";
import {
  parseLicenseActivations,
  parseLicenseSeatLimit,
} from "./license-activations.utils";
import type { FeatureRecordValue } from "./feature-records.types";
import type {
  CustomerPortalData,
  CustomerPortalPurchase,
  CustomerPortalSubscription,
} from "./customer-portal.types";
import { getAppLicenseStatus } from "./app-license";
import {
  canSellExtraSeats,
  defaultExtraSeatLabel,
  maxExtraSeats,
  parseExtraSeatTiers,
} from "./extra-seats";
import { getPayPalCredentials, getStripeCredentials } from "./payment-credentials";
import { loadCustomerPortalResources } from "./customer-portal.queries";

function parseRecordData(value: string): Record<string, FeatureRecordValue> {
  try {
    return JSON.parse(value) as Record<string, FeatureRecordValue>;
  } catch {
    return {};
  }
}

export async function getCustomerPortalData(
  email: string,
  environment: "live" | "sandbox" = "live",
): Promise<CustomerPortalData> {
  const db = await getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const [licenseStatus, orderRows, records] = await Promise.all([
    getAppLicenseStatus(),
    db.query.orders.findMany({
      where: sql`lower(${orders.customerEmail}) = ${normalizedEmail} AND ${orders.environment} = ${environment} AND ${orders.status} IN ('paid', 'refunded')`,
      orderBy: [desc(orders.createdAt)],
    }),
    db.query.featureRecords.findMany({
      where: sql`lower(${featureRecords.subtitle}) = ${normalizedEmail} AND ${featureRecords.environment} = ${environment} AND (${featureRecords.feature} = 'licenses' OR ${featureRecords.feature} = 'subscriptions')`,
      orderBy: [desc(featureRecords.updatedAt)],
    }),
  ]);
  const affiliatesUnlocked =
    licenseStatus.pro && licenseStatus.features.includes("affiliates");
  const githubUnlocked =
    licenseStatus.pro && licenseStatus.features.includes("private_github");
  const licenses = records
    .filter((record) => record.feature === "licenses")
    .map((record) => ({ record, data: parseRecordData(record.data) }));
  const subscriptionsWithData = records
    .filter((record) => record.feature === "subscriptions")
    .map((record) => ({ record, data: parseRecordData(record.data) }));
  const { productsById, storesById } = await loadCustomerPortalResources(
    orderRows.map((order) => order.productId),
    [
      ...orderRows.flatMap((order) => (order.storeId ? [order.storeId] : [])),
      ...subscriptionsWithData.flatMap(({ data }) =>
        typeof data.storeId === "string" ? [data.storeId] : [],
      ),
    ],
  );
  // Payment setup for orders that can buy more seats, keyed by order id.
  const paymentByOrderId = new Map<
    string,
    { paypalClientId?: string; stripeEnabled: boolean; mode: "sandbox" | "live" }
  >();
  await Promise.all(
    orderRows.map(async (order) => {
      const product = productsById.get(order.productId);
      const store = order.storeId ? storesById.get(order.storeId) : undefined;
      if (!product?.extraSeatsEnabled || !store) return;
      const [paypal, stripe] = await Promise.all([
        store.paymentGateway === "paypal"
          ? getPayPalCredentials(product.userId, product.environment, product.storeId ?? undefined)
          : undefined,
        store.paymentGateway === "stripe"
          ? getStripeCredentials(product.userId, product.environment, product.storeId ?? undefined)
          : undefined,
      ]);
      paymentByOrderId.set(order.id, {
        paypalClientId: paypal?.clientId,
        stripeEnabled: Boolean(stripe),
        mode: paypal?.mode || stripe?.mode || product.environment,
      });
    }),
  );
  const purchases = orderRows.map((order): CustomerPortalPurchase => {
      const orderProductFiles = parseProductFiles(order.productFiles);
      const product = productsById.get(order.productId);
      const store = order.storeId ? storesById.get(order.storeId) : undefined;
      const license = licenses.find(
        (candidate) =>
          candidate.data.orderId === order.id ||
          (candidate.data.subscriptionLicense === true &&
            candidate.data.productId === order.productId &&
            String(candidate.record.subtitle || "").toLowerCase() ===
              order.customerEmail.toLowerCase()),
      );
      const licenseEntitlement = license
        ? getLicenseEntitlementSummary({
            status: license.record.status,
            data: license.data,
          })
        : undefined;
      const currentUpdatesIncluded = Boolean(
        licenseEntitlement?.perpetual && licenseEntitlement.updatesActive,
      );
      const currentProductFiles = parseProductFiles(product?.productFiles);
      const availableProductFiles = currentUpdatesIncluded
        ? [
            ...currentProductFiles,
            ...orderProductFiles.filter(
              (orderFile) =>
                !currentProductFiles.some(
                  (currentFile) => currentFile.id === orderFile.id,
                ),
            ),
          ]
        : orderProductFiles.length
          ? orderProductFiles
          : currentProductFiles;
      const extraSeatTiers = parseExtraSeatTiers(product?.extraSeatTiers ?? "[]");
      const currentExtraSeats = Math.max(
        0,
        Number(license?.data.extraSeats) || 0,
      );
      const seatAddOn: CustomerPortalPurchase["seatAddOn"] =
        product &&
        order.status === "paid" &&
        license?.record.status === "active" &&
        parseLicenseSeatLimit(license.data.seatLimit) !== null &&
        product.status === "published" &&
        product.billingType !== "subscription" &&
        paymentByOrderId.has(order.id) &&
        currentExtraSeats < maxExtraSeats &&
        canSellExtraSeats({
          generateLicense: product.generateLicense,
          licenseSeatLimit: product.licenseSeatLimit,
          extraSeatsEnabled: product.extraSeatsEnabled,
          extraSeatTiers,
        })
          ? {
              productId: product.id,
              storeId: order.storeId ?? product.storeId ?? "",
              customerEmail: order.customerEmail,
              transactionFeeType: product.transactionFeeType,
              transactionFeeValue: product.transactionFeeValue,
              ...paymentByOrderId.get(order.id)!,
              label: product.extraSeatLabel || defaultExtraSeatLabel,
              tiers: extraSeatTiers,
              currentExtraSeats,
            }
          : undefined;
      return {
        id: order.id,
        productName: order.productName,
        productDescription:
          order.productDescription ?? product?.description ?? "",
        productImageUrl: product?.imageUrl ?? undefined,
        productPrice:
          order.productPrice ??
          product?.price ??
          order.amount + order.discountAmount - order.transactionFeeAmount,
        storeName: store?.name || "Store",
        storeLogoImageUrl: store?.logoImageUrl ?? undefined,
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        discountCode: order.discountCode ?? undefined,
        discountAmount: order.discountAmount,
        transactionFeeAmount: order.transactionFeeAmount,
        gateway: order.gateway,
        environment: order.environment,
        paypalOrderId: order.paypalOrderId ?? undefined,
        paypalCaptureId: order.paypalCaptureId ?? undefined,
        stripeCheckoutSessionId: order.stripeCheckoutSessionId ?? undefined,
        stripePaymentIntentId: order.stripePaymentIntentId ?? undefined,
        createdAt: order.createdAt,
        paidAt: order.paidAt ?? undefined,
        deliveryContent:
          order.status === "paid"
            ? currentUpdatesIncluded
              ? (product?.deliveryContent ?? order.deliveryContent ?? undefined)
              : (order.deliveryContent ?? product?.deliveryContent ?? undefined)
            : undefined,
        productFiles:
          order.status === "paid"
            ? availableProductFiles
            : [],
        license: license
          ? {
              key: license.record.title,
              status: license.record.status,
              expiresAt:
                typeof license.data.expiresAt === "string"
                  ? license.data.expiresAt
                  : undefined,
              type: licenseEntitlement?.type || "standard",
              perpetual: licenseEntitlement?.perpetual || false,
              updatesExpireAt: licenseEntitlement?.updatesExpireAt,
              updatesActive: licenseEntitlement?.updatesActive ?? false,
              seatLimit: parseLicenseSeatLimit(license.data.seatLimit),
              activations: parseLicenseActivations(
                license.data.appActivations,
              ),
            }
          : undefined,
        seatAddOn,
        githubRepository: githubUnlocked &&
          (order.githubRepoOwner || product?.githubRepoOwner) &&
          (order.githubRepoName || product?.githubRepoName)
            ? `${order.githubRepoOwner || product?.githubRepoOwner}/${order.githubRepoName || product?.githubRepoName}`
            : undefined,
        githubAccessStatus: githubUnlocked &&
          (order.githubRepoOwner || product?.githubRepoOwner) &&
          (order.githubRepoName || product?.githubRepoName)
            ? order.githubAccessStatus
            : undefined,
        githubUsername: order.githubUsername ?? undefined,
        githubAccessError: order.githubAccessError ?? undefined,
        affiliateProgramEnabled:
          affiliatesUnlocked && (store?.affiliatesEnabled ?? false),
      };
    });
  const subscriptions = subscriptionsWithData.map(
      ({ record, data }): CustomerPortalSubscription => {
        const storeId =
          typeof data.storeId === "string" ? data.storeId : undefined;
        const store = storeId ? storesById.get(storeId) : undefined;
        return {
          id: record.id,
          planName: record.title,
          storeName: store?.name || "Store",
          storeLogoImageUrl: store?.logoImageUrl ?? undefined,
          status: record.status,
          amount: typeof data.amount === "number" ? data.amount : undefined,
          interval:
            typeof data.interval === "string" ? data.interval : undefined,
          trialDays:
            typeof data.trialDays === "number" ? data.trialDays : undefined,
          trialEndsAt:
            typeof data.trialEndsAt === "string" ? data.trialEndsAt : undefined,
          nextBillingAt:
            typeof data.nextBillingAt === "string"
              ? data.nextBillingAt
              : undefined,
          updatedAt: record.updatedAt,
          affiliateProgramEnabled:
            affiliatesUnlocked && (store?.affiliatesEnabled ?? false),
        };
      },
  );
  return {
    purchases,
    subscriptions,
    affiliatesEnabled:
      purchases.some((purchase) => purchase.affiliateProgramEnabled) ||
      subscriptions.some(
        (subscription) => subscription.affiliateProgramEnabled,
      ),
    branding: purchases[0]
      ? {
          storeSlug: purchases[0].storeName,
          storeName: purchases[0].storeName,
          storeLogoImageUrl: purchases[0].storeLogoImageUrl,
        }
      : subscriptions[0]
        ? {
            storeSlug: subscriptions[0].storeName,
            storeName: subscriptions[0].storeName,
            storeLogoImageUrl: subscriptions[0].storeLogoImageUrl,
          }
        : undefined,
  };
}
