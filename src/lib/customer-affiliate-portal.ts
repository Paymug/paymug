import "server-only";

import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { featureRecords, orders } from "@/db/schema";
import { listProductsByUser } from "./db";
import { listFeatureRecords } from "./feature-records";
import { getStoreById } from "./stores";
import {
  createAffiliateCountSeries,
  isCustomerAffiliateRecord,
} from "./customer-affiliate-portal.utils";
import type {
  CustomerAffiliatePortalData,
  CustomerAffiliateProgram,
} from "./customer-affiliate-portal.types";
import { hasProFeature } from "./app-license";

export async function getCustomerAffiliatePortalData(
  email: string,
): Promise<CustomerAffiliatePortalData> {
  if (!(await hasProFeature("affiliates"))) return { programs: [] };
  const db = await getDb();
  const normalizedEmail = email.trim().toLowerCase();
  const [orderRows, subscriptionRows] = await Promise.all([
    db.query.orders.findMany({
      columns: { userId: true, storeId: true },
      where: sql`lower(${orders.customerEmail}) = ${normalizedEmail} AND ${orders.environment} = 'live' AND ${orders.status} IN ('paid', 'refunded')`,
    }),
    db.query.featureRecords.findMany({
      columns: { userId: true, data: true },
      where: sql`lower(${featureRecords.subtitle}) = ${normalizedEmail} AND ${featureRecords.environment} = 'live' AND ${featureRecords.feature} = 'subscriptions'`,
    }),
  ]);
  const storeOwners = new Map<string, string>();
  orderRows.forEach((order) => {
    if (order.storeId) storeOwners.set(order.storeId, order.userId);
  });
  subscriptionRows.forEach((subscription) => {
    try {
      const data = JSON.parse(subscription.data) as Record<string, unknown>;
      if (typeof data.storeId === "string") {
        storeOwners.set(data.storeId, subscription.userId);
      }
    } catch {
      // Ignore legacy subscription data that cannot identify a store.
    }
  });

  const programs = await Promise.all(
    [...storeOwners].map(async ([storeId, userId]) => {
      const store = await getStoreById(storeId, userId);
      if (!store?.affiliatesEnabled) return undefined;
      const [products, affiliates, clicks, referrals, payouts] =
        await Promise.all([
          listProductsByUser(userId, store.id, "live"),
          listFeatureRecords(userId, "affiliates", "live"),
          listFeatureRecords(userId, "affiliate-clicks", "live"),
          listFeatureRecords(userId, "affiliate-referrals", "live"),
          listFeatureRecords(userId, "affiliate-payouts", "live"),
        ]);
      const affiliate = affiliates.find(
        (record) =>
          record.subtitle?.trim().toLowerCase() === normalizedEmail &&
          (!record.data.storeId || record.data.storeId === store.id),
      );
      const baseProgram = {
        storeId: store.id,
        storeUserId: userId,
        storeName: store.name,
        storeSlug: store.slug,
        storeDescription: store.description,
        storeLogoImageUrl: store.logoImageUrl,
        currency: store.currency,
        commissionType: store.affiliateCommissionType,
        commissionValue: store.affiliateCommissionValue,
        commissionDuration: store.affiliateCommissionDuration,
        initialProductPriceCents:
          products.find((product) => product.status === "published")?.price ??
          10000,
        products: products
          .filter((product) => product.status === "published")
          .map((product) => ({
            id: product.id,
            name: product.name,
            description: product.description,
            price: product.price,
            currency: product.currency,
            imageUrl: product.imageUrl,
          })),
      };
      if (!affiliate) {
        return {
          ...baseProgram,
          state: "available",
        } satisfies CustomerAffiliateProgram;
      }
      const identity = {
        id: affiliate.id,
        name: affiliate.title,
        status: affiliate.status,
        code: String(affiliate.data.code || ""),
        trackingPath: String(
          affiliate.data.trackingPath ||
            `/r/${store.slug}/${String(affiliate.data.code || "")}`,
        ),
        rejectionMessage:
          String(affiliate.data.rejectionMessage || "") || undefined,
        usernameLocked: Boolean(affiliate.data.usernameSetAt),
      };
      if (affiliate.status === "rejected") {
        return {
          ...baseProgram,
          state: "rejected",
          affiliate: identity,
        } satisfies CustomerAffiliateProgram;
      }
      if (affiliate.status !== "active") {
        return {
          ...baseProgram,
          state: "pending",
          affiliate: identity,
        } satisfies CustomerAffiliateProgram;
      }
      const affiliateClicks = clicks.filter((record) =>
        isCustomerAffiliateRecord(record, affiliate.id, store.id),
      );
      const affiliateReferrals = referrals.filter((record) =>
        isCustomerAffiliateRecord(record, affiliate.id, store.id),
      );
      const processedReferrals = affiliateReferrals.filter(
        (record) => record.status !== "rejected",
      );
      const unpaidReferrals = processedReferrals.filter(
        (record) => record.status !== "paid",
      );
      const affiliatePayouts = payouts.filter(
        (record) =>
          (record.data.affiliateId === affiliate.id ||
            (!record.data.affiliateId && record.title === affiliate.title)) &&
          (!record.data.storeId || record.data.storeId === store.id),
      );
      const processedPurchaseAmount = processedReferrals.reduce(
        (total, record) => total + Number(record.data.amount || 0),
        0,
      );
      const totalEarnings = processedReferrals.reduce(
        (total, record) => total + Number(record.data.commission || 0),
        0,
      );
      const unpaidEarnings = unpaidReferrals.reduce(
        (total, record) => total + Number(record.data.commission || 0),
        0,
      );
      return {
        ...baseProgram,
        state: "active",
        affiliate: identity,
        analytics: {
          clicks: affiliateClicks.length,
          processedPurchases: processedReferrals.length,
          processedPurchaseAmount,
          totalEarnings,
          unpaidEarnings,
          payouts: affiliatePayouts.length,
          conversionRate: affiliateClicks.length
            ? (processedReferrals.length / affiliateClicks.length) * 100
            : 0,
          purchaseSeries: createAffiliateCountSeries(processedReferrals, 30),
          clickSeries: createAffiliateCountSeries(affiliateClicks, 14),
          recentPurchases: processedReferrals.slice(0, 8).map((record) => ({
            id: record.id,
            orderId: record.subtitle || record.id,
            amount: Number(record.data.amount || 0),
            commission: Number(record.data.commission || 0),
            status: record.status,
            createdAt: record.createdAt,
          })),
          payoutReports: affiliatePayouts.map((record) => ({
            id: record.id,
            amount: Number(record.data.amount || 0),
            status: record.status,
            reference: record.subtitle,
            createdAt: record.createdAt,
            paidAt: String(record.data.paidAt || "") || undefined,
          })),
        },
      } satisfies CustomerAffiliateProgram;
    }),
  );

  return {
    programs: programs.filter((program) => program !== undefined),
  };
}
