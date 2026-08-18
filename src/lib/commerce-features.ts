import "server-only";

import { randomBytes } from "crypto";
import {
  createFeatureRecord,
  findFeatureRecord,
  findFeatureRecordBySubtitle,
  findFeatureRecordByTitle,
  listFeatureRecords,
  updateFeatureRecord,
} from "./feature-records";
import type { FeatureRecord } from "./feature-records.types";
import type { Order, PayPalMode, Product } from "./types";
import type {
  AppliedDiscount,
  CompleteCommerceFeaturesOptions,
} from "./commerce-features.types";
import { grantGitHubOrderAccess } from "./github-access";
import { calculateAffiliateCommission } from "./affiliate-settings.utils";
import { getStoreById } from "./stores";
import { findOrderById } from "./db";
import {
  calculateLicenseUpdatesExpireAt,
  extendLicenseUpdatesExpireAt,
  isPerpetualLicenseProduct,
} from "./license-entitlements";
import { hasProFeature } from "./app-license";

export async function resolveDiscount(
  userId: string,
  code: string | undefined,
  price: number,
  productId: string,
  storeId: string,
  environment?: PayPalMode
): Promise<AppliedDiscount | undefined> {
  if (!code?.trim()) return undefined;
  const normalizedCode = code.trim().toUpperCase();
  const discount = await findFeatureRecordByTitle(
    userId,
    "discounts",
    normalizedCode,
    environment
  );
  if (!discount || discount.status !== "active") {
    throw new Error("Discount code is invalid or inactive");
  }
  const discountStoreId = String(discount.data.storeId || "");
  if (discountStoreId && discountStoreId !== storeId) {
    throw new Error("Discount code is not valid for this store");
  }
  const storedProductIds =
    discount.data.productIds ?? discount.data.productId ?? "all";
  const discountProductIds = Array.isArray(storedProductIds)
    ? storedProductIds.map(String)
    : String(storedProductIds).split(",");
  if (
    !discountProductIds.includes("all") &&
    !discountProductIds.includes(productId)
  ) {
    throw new Error("Discount code is not valid for this product");
  }

  const expiresAt = String(discount.data.expiresAt || "");
  if (expiresAt && new Date(expiresAt) < new Date()) {
    throw new Error("Discount code has expired");
  }

  const usageLimit = Number(discount.data.usageLimit || 0);
  const usageCount = Number(discount.data.usageCount || 0);
  if (usageLimit > 0 && usageCount >= usageLimit) {
    throw new Error("Discount code has reached its usage limit");
  }

  const value = Math.max(0, Number(discount.data.value || 0));
  const amount =
    discount.data.type === "fixed"
      ? Math.round(value * 100)
      : Math.round(price * Math.min(value, 100) / 100);

  return {
    record: discount,
    code: normalizedCode,
    amount: Math.min(price, Math.max(0, amount)),
    subscriptionPeriods:
      Number.isInteger(Number(discount.data.subscriptionPeriods)) &&
      Number(discount.data.subscriptionPeriods) > 0
        ? Number(discount.data.subscriptionPeriods)
        : undefined,
  };
}

export async function findAffiliateByCode(
  userId: string,
  code: string | undefined,
  storeId?: string,
  environment?: PayPalMode
): Promise<FeatureRecord | undefined> {
  if (!code) return undefined;
  if (!(await hasProFeature("affiliates"))) return undefined;
  const store = storeId ? await getStoreById(storeId, userId) : undefined;
  if (storeId && !store) return undefined;
  if (store && !store.affiliatesEnabled) return undefined;
  const affiliates = await listFeatureRecords(
    userId,
    "affiliates",
    environment
  );
  return affiliates.find((affiliate) => {
    const affiliateStoreId = String(affiliate.data.storeId || "");
    return (
      affiliate.status === "active" &&
      String(affiliate.data.code || "").toLowerCase() ===
        code.toLowerCase() &&
      (!storeId || !affiliateStoreId || affiliateStoreId === storeId)
    );
  });
}

export async function subscribeCheckoutCustomer(
  userId: string,
  email: string,
  name?: string,
  environment?: PayPalMode
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await findFeatureRecordByTitle(
    userId,
    "subscribers",
    normalizedEmail,
    environment
  );
  if (existing) {
    await updateFeatureRecord(existing.id, userId, {
      subtitle: name || existing.subtitle,
      status: "subscribed",
      data: { ...existing.data, source: "checkout" },
    });
    return;
  }
  await createFeatureRecord(userId, "subscribers", {
    environment,
    title: normalizedEmail,
    subtitle: name,
    status: "subscribed",
    data: { source: "checkout" },
  });
}

export async function recordAffiliateClick(input: {
  userId: string;
  storeId: string;
  affiliate: FeatureRecord;
  destination: string;
  referrer?: string;
}): Promise<void> {
  await createFeatureRecord(input.userId, "affiliate-clicks", {
    environment: input.affiliate.environment,
    title: input.affiliate.title,
    subtitle: input.destination,
    status: "recorded",
    data: {
      affiliateId: input.affiliate.id,
      storeId: input.storeId,
      referrer: input.referrer || "Direct",
      clickedAt: new Date().toISOString(),
    },
  });
}

export async function completeCommerceFeatures(
  order: Order,
  product?: Product,
  options: CompleteCommerceFeaturesOptions = {}
): Promise<void> {
  await upsertCustomer(order);
  if (options.provisionBenefits !== false) {
    if (product?.generateLicense) {
      await issueLicense(order, product);
    }
    if (
      order.githubAccessStatus !== "invited" &&
      order.githubAccessStatus !== "existing"
    ) {
      await grantGitHubOrderAccess(order, product);
    }
  }

  if (order.discountCode && options.recordDiscount !== false) {
    const discount = await findFeatureRecordByTitle(
      order.userId,
      "discounts",
      order.discountCode,
      order.environment
    );
    if (discount) {
      const processedOrderIds = Array.isArray(
        discount.data.processedOrderIds
      )
        ? discount.data.processedOrderIds
        : [];
      if (!processedOrderIds.includes(order.id)) {
        await updateFeatureRecord(discount.id, order.userId, {
          data: {
            ...discount.data,
            usageCount: Number(discount.data.usageCount || 0) + 1,
            processedOrderIds: [...processedOrderIds, order.id].slice(-100),
          },
        });
      }
    }
  }

  if (
    order.affiliateId &&
    options.recordAffiliate !== false &&
    (await hasProFeature("affiliates"))
  ) {
    const affiliate = await findFeatureRecord(order.affiliateId, order.userId);
    const store = await getStoreById(order.storeId, order.userId);
    const referrals = await listFeatureRecords(
      order.userId,
      "affiliate-referrals",
      order.environment
    );
    const existingReferral = referrals.find(
      (referral) => referral.subtitle === order.id
    );
    const previousCustomerReferral = referrals.some(
      (referral) =>
        String(referral.data.affiliateId || "") === order.affiliateId &&
        String(referral.data.customerEmail || "").toLowerCase() ===
          order.customerEmail.toLowerCase()
    );
    const canCreateCommission =
      Boolean(store?.affiliatesEnabled) &&
      (store?.affiliateCommissionDuration === "recurring" ||
        !previousCustomerReferral);
    if (affiliate && !existingReferral && store && canCreateCommission) {
      await createFeatureRecord(order.userId, "affiliate-referrals", {
        environment: order.environment,
        title: affiliate.title,
        subtitle: order.id,
        status: "pending",
        data: {
          affiliateId: affiliate.id,
          storeId: order.storeId,
          amount: order.amount / 100,
          commission: calculateAffiliateCommission(
            order.amount,
            store.affiliateCommissionType,
            store.affiliateCommissionValue
          ),
          commissionType: store.affiliateCommissionType,
          commissionValue: store.affiliateCommissionValue,
          commissionDuration: store.affiliateCommissionDuration,
          customerEmail: order.customerEmail,
        },
      });
    }
  }
}

export async function getOrderLicense(
  userId: string,
  orderId: string
): Promise<FeatureRecord | undefined> {
  const licenses = await listFeatureRecords(userId, "licenses");
  const direct = licenses.find((license) => license.data.orderId === orderId);
  if (direct) return direct;
  const order = await findOrderById(orderId);
  if (!order) return undefined;
  return licenses.find(
    (license) =>
      license.data.subscriptionLicense === true &&
      license.data.productId === order.productId &&
      String(license.subtitle || "").toLowerCase() ===
        order.customerEmail.toLowerCase()
  );
}

async function upsertCustomer(order: Order): Promise<void> {
  const email = order.customerEmail.trim().toLowerCase();
  const existing = await findFeatureRecordBySubtitle(
    order.userId,
    "customers",
    email,
    order.environment
  );
  if (existing) {
    const processedOrderIds = Array.isArray(existing.data.processedOrderIds)
      ? existing.data.processedOrderIds
      : [];
    if (processedOrderIds.includes(order.id)) return;
    await updateFeatureRecord(existing.id, order.userId, {
      title: order.customerName || existing.title,
      data: {
        ...existing.data,
        ordersCount: Number(existing.data.ordersCount || 0) + 1,
        totalSpent:
          Number(existing.data.totalSpent || 0) + order.amount / 100,
        lastOrderAt: order.paidAt || new Date().toISOString(),
        processedOrderIds: [...processedOrderIds, order.id].slice(-100),
      },
    });
    return;
  }
  await createFeatureRecord(order.userId, "customers", {
    environment: order.environment,
    title: order.customerName || email,
    subtitle: email,
    status: "active",
    data: {
      ordersCount: 1,
      totalSpent: order.amount / 100,
      lastOrderAt: order.paidAt || new Date().toISOString(),
      processedOrderIds: [order.id],
    },
  });
}

async function issueLicense(order: Order, product: Product): Promise<void> {
  const licenses = await listFeatureRecords(
    order.userId,
    "licenses",
    order.environment
  );
  const perpetual = isPerpetualLicenseProduct(product);
  const subscriptionLicense = perpetual && product.billingType === "subscription";
  const foreverFreeSubscription =
    subscriptionLicense && order.gateway === "free";
  const existing =
    licenses.find((license) => license.data.orderId === order.id) ||
    (subscriptionLicense
      ? licenses.find(
          (license) =>
            license.data.subscriptionLicense === true &&
            license.data.productId === product.id &&
            String(license.subtitle || "").toLowerCase() ===
              order.customerEmail.toLowerCase()
        )
      : undefined);
  const issuedAt = order.paidAt || new Date().toISOString();
  const updatePeriodUnit =
    product.licenseUpdatePeriodUnit ||
    (product.intervalUnit === "week" ||
    product.intervalUnit === "month" ||
    product.intervalUnit === "year"
      ? product.intervalUnit
      : "year");
  const updatePeriodCount = Math.max(
    1,
    product.billingType === "subscription"
      ? product.intervalCount || 1
      : product.licenseUpdatePeriodCount || 1
  );
  if (existing) {
    if (subscriptionLicense) {
      await updateFeatureRecord(existing.id, order.userId, {
        data: {
          ...existing.data,
          latestOrderId: order.id,
          updatesStatus: "active",
          updatesExpiredAt: null,
          foreverFreeSubscription:
            existing.data.foreverFreeSubscription === true ||
            foreverFreeSubscription,
          updatesExpireAt: foreverFreeSubscription
            ? null
            : extendLicenseUpdatesExpireAt(
                existing.data.updatesExpireAt,
                issuedAt,
                updatePeriodUnit,
                updatePeriodCount
              ),
        },
      });
    }
    return;
  }
  const segment = randomBytes(9).toString("hex").toUpperCase();
  const key = `PAYMUG-${segment.slice(0, 6)}-${segment.slice(6, 12)}-${segment.slice(12, 18)}`;
  await createFeatureRecord(order.userId, "licenses", {
    environment: order.environment,
    title: key,
    subtitle: order.customerEmail,
    status: "active",
    data: {
      orderId: order.id,
      storeId: order.storeId,
      product: order.productName,
      productId: product.id,
      customerEmail: order.customerEmail,
      issuedAt,
      licenseType: perpetual ? "perpetual" : "standard",
      ...(perpetual
        ? {
            perpetual: true,
            subscriptionLicense,
            updatesPeriodUnit: updatePeriodUnit,
            updatesPeriodCount: updatePeriodCount,
            foreverFreeSubscription,
            ...(foreverFreeSubscription
              ? {}
              : {
                  updatesExpireAt: calculateLicenseUpdatesExpireAt(
                    issuedAt,
                    updatePeriodUnit,
                    updatePeriodCount
                  ),
                }),
          }
        : {}),
    },
  });
}
