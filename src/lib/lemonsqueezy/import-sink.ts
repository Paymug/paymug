import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { getDb, type Db } from "@/db";
import {
  featureRecords,
  orders,
  productVariants,
  products,
} from "@/db/schema";
import { storeProductFile } from "../product-file-storage";
import type { ProductFile } from "../product-files.types";
import { uid } from "../utils";
import { seatLimitToColumn } from "../product-variants";
import type { ImportSink, StoredFileRef, UpsertResult } from "./import-engine";
import type { OrderGateway } from "../types";
import { lemonSqueezySource } from "./mappers";

type Feature = "customers" | "licenses" | "discounts" | "affiliates" | "subscriptions";

export interface SinkContext {
  userId: string;
  storeId: string;
  environment: "sandbox" | "live";
  /** Migration source id; defaults to Lemon Squeezy. */
  source?: string;
  /** Test seam: use this database instead of the request-scoped one. */
  db?: Db;
}

/** D1-backed sink. Writes rows directly so no webhook, email or notification fires. */
export async function createD1ImportSink(ctx: SinkContext): Promise<ImportSink> {
  const db = ctx.db ?? (await getDb());
  const { userId, storeId, environment } = ctx;
  const source = ctx.source ?? lemonSqueezySource;

  async function findFeature(
    feature: Feature,
    where: ReturnType<typeof sql>,
  ) {
    return db.query.featureRecords.findFirst({
      where: and(
        eq(featureRecords.userId, userId),
        eq(featureRecords.environment, environment),
        eq(featureRecords.feature, feature),
        where,
      ),
    });
  }

  async function upsertFeature(
    feature: Feature,
    sourceId: string,
    input: {
      title: string;
      subtitle?: string;
      status: string;
      createdAt?: string | null;
      data: Record<string, unknown>;
    },
    matchExtra?: ReturnType<typeof sql>,
  ): Promise<UpsertResult> {
    const existing = await findFeature(
      feature,
      matchExtra ??
        sql`json_extract(${featureRecords.data}, '$.source') = ${source} AND json_extract(${featureRecords.data}, '$.sourceId') = ${sourceId}`,
    );
    if (existing) {
      // A previous partial run may have left reference fields empty (for
      // example the product failed). Fill those in, never overwrite values.
      const data = safeJson(existing.data);
      let changed = false;
      for (const key of ["orderId", "productId", "product", "variantId", "variantName"]) {
        const wanted = input.data[key];
        if ((data[key] === null || data[key] === undefined) && wanted != null) {
          data[key] = wanted;
          changed = true;
        }
      }
      if (changed) {
        await db
          .update(featureRecords)
          .set({ data: JSON.stringify(data), updatedAt: new Date().toISOString() })
          .where(eq(featureRecords.id, existing.id));
      }
      return { id: existing.id, created: false };
    }
    const id = uid();
    const now = new Date().toISOString();
    await db.insert(featureRecords).values({
      id,
      userId,
      environment,
      feature,
      title: input.title,
      subtitle: input.subtitle ?? null,
      status: input.status,
      data: JSON.stringify({
        ...input.data,
        storeId,
        source,
        sourceId,
      }),
      createdAt: input.createdAt || now,
      updatedAt: now,
    });
    return { id, created: true };
  }

  async function ensureCustomerRecord(email: string, name: string | null) {
    return upsertFeature(
      "customers",
      email,
      {
        title: name || email,
        subtitle: email,
        status: "active",
        data: { ordersCount: 0, totalSpent: 0, processedOrderIds: [] },
      },
      sql`lower(${featureRecords.subtitle}) = ${email}`,
    );
  }

  return {
    async upsertProduct(item) {
      const existing = await db.query.products.findFirst({
        where: and(
          eq(products.userId, userId),
          eq(products.environment, environment),
          eq(products.source, source),
          eq(products.sourceId, item.sourceId),
        ),
      });
      if (existing) return { id: existing.id, created: false };
      const id = uid();
      const now = new Date().toISOString();
      await db.insert(products).values({
        id,
        userId,
        storeId,
        environment,
        name: item.name,
        slug: item.slug,
        description: item.description,
        price: item.price,
        status: item.status,
        imageUrl: item.imageUrl,
        source,
        sourceId: item.sourceId,
        createdAt: now,
        updatedAt: now,
      });
      return { id, created: true };
    },

    async upsertVariant(item, productId) {
      const existing = await db.query.productVariants.findFirst({
        where: and(
          eq(productVariants.userId, userId),
          eq(productVariants.environment, environment),
          eq(productVariants.source, source),
          eq(productVariants.sourceId, item.sourceId),
        ),
      });
      if (existing) return { id: existing.id, created: false };
      const id = uid();
      const now = new Date().toISOString();
      await db.insert(productVariants).values({
        id,
        productId,
        userId,
        storeId,
        environment,
        name: item.name,
        slug: item.slug,
        description: item.description,
        sort: item.sort,
        status: item.status,
        price: item.price,
        customAmountEnabled: item.customAmountEnabled,
        minPrice: item.minPrice,
        suggestedPrice: item.suggestedPrice,
        billingType: item.billingType,
        intervalUnit: item.intervalUnit,
        intervalCount: item.intervalCount,
        trialDays: item.trialDays,
        generateLicense: item.generateLicense,
        licenseType: item.licenseType,
        licenseSeatLimit: seatLimitToColumn(item.licenseSeatLimit),
        licenseUpdatePeriodUnit: item.licenseUpdatePeriodUnit,
        licenseUpdatePeriodCount: item.licenseUpdatePeriodCount,
        githubRepoOwner: item.githubRepoOwner ?? null,
        githubRepoName: item.githubRepoName ?? null,
        deliveryContent: item.deliveryContent ?? null,
        source,
        sourceId: item.sourceId,
        createdAt: now,
        updatedAt: now,
      });
      // The product list price is the cheapest published variant, for
      // storefront "from" pricing. Checkout itself reads the variant.
      if (item.status === "published") {
        const product = await db.query.products.findFirst({
          columns: { price: true },
          where: eq(products.id, productId),
        });
        const lowest = (await db.query.productVariants.findMany({
          columns: { price: true },
          where: and(
            eq(productVariants.productId, productId),
            eq(productVariants.status, "published"),
          ),
        })).map((row) => row.price);
        if (lowest.length && Math.min(...lowest) !== product?.price) {
          await db
            .update(products)
            .set({ price: Math.min(...lowest), updatedAt: now })
            .where(eq(products.id, productId));
        }
      }
      return { id, created: true };
    },

    async getVariantFileNames(variantId) {
      const row = await db.query.productVariants.findFirst({
        columns: { productFiles: true },
        where: eq(productVariants.id, variantId),
      });
      return parseFiles(row?.productFiles).map((file) => file.name);
    },

    async storeFile(bytes, name, type) {
      const file = new File([bytes], name, { type });
      const stored = await storeProductFile(file, userId, "delivery");
      return stored satisfies StoredFileRef;
    },

    async appendVariantFiles(variantId, files) {
      const row = await db.query.productVariants.findFirst({
        columns: { productFiles: true },
        where: eq(productVariants.id, variantId),
      });
      const merged = [...parseFiles(row?.productFiles), ...files];
      await db
        .update(productVariants)
        .set({ productFiles: JSON.stringify(merged), updatedAt: new Date().toISOString() })
        .where(eq(productVariants.id, variantId));
    },

    async upsertCustomer(item) {
      return upsertFeature(
        "customers",
        item.email,
        {
          title: item.name,
          subtitle: item.email,
          status: "active",
          createdAt: item.createdAt,
          data: { ordersCount: 0, totalSpent: 0, processedOrderIds: [], lemonSqueezyCustomerId: item.sourceId, sourceCustomerId: item.sourceId },
        },
        sql`lower(${featureRecords.subtitle}) = ${item.email}`,
      );
    },

    async upsertOrder(item, refs) {
      const existing = await db.query.orders.findFirst({
        where: and(
          eq(orders.userId, userId),
          eq(orders.environment, environment),
          eq(orders.source, source),
          eq(orders.sourceId, item.sourceId),
        ),
      });
      if (existing) return { id: existing.id, created: false };
      const id = uid();
      await db.insert(orders).values({
        id,
        userId,
        storeId,
        productId: refs.productId,
        productName: item.productName,
        variantId: refs.variantId,
        variantName: item.variantName,
        amount: item.amount,
        currency: item.currency,
        status: item.status,
        customerEmail: item.email,
        customerName: item.customerName,
        discountAmount: item.discountAmount,
        environment,
        gateway: source as OrderGateway,
        source,
        sourceId: item.sourceId,
        createdAt: item.createdAt,
        paidAt: item.paidAt,
      });
      // Keep customer totals in step, once per newly imported order.
      const customer = await ensureCustomerRecord(item.email, item.customerName);
      if (item.status === "paid" || item.status === "refunded") {
        const row = await db.query.featureRecords.findFirst({
          where: eq(featureRecords.id, customer.id),
        });
        if (row) {
          const data = safeJson(row.data);
          const processed = Array.isArray(data.processedOrderIds)
            ? (data.processedOrderIds as string[])
            : [];
          data.ordersCount = Number(data.ordersCount || 0) + 1;
          data.totalSpent =
            Number(data.totalSpent || 0) +
            (item.status === "paid" ? item.amount / 100 : 0);
          const last = String(data.lastOrderAt || "");
          if (!last || last < item.createdAt) data.lastOrderAt = item.createdAt;
          data.processedOrderIds = [...processed, id].slice(-100);
          await db
            .update(featureRecords)
            .set({ data: JSON.stringify(data), updatedAt: new Date().toISOString() })
            .where(eq(featureRecords.id, row.id));
        }
      }
      return { id, created: true };
    },

    async markOrdersRefunded(sourceId) {
      const rows = await db
        .select({ id: orders.id })
        .from(orders)
        .where(
          and(
            eq(orders.userId, userId),
            eq(orders.environment, environment),
            eq(orders.source, source),
            sql`(${orders.sourceId} = ${sourceId} OR ${orders.sourceId} LIKE ${sourceId + ":%"})`,
            eq(orders.status, "paid"),
          ),
        );
      for (const row of rows) {
        await db.update(orders).set({ status: "refunded" }).where(eq(orders.id, row.id));
      }
      return rows.length;
    },

    async upsertLicense(item, refs) {
      return upsertFeature(
        "licenses",
        item.sourceId,
        {
          title: item.key,
          subtitle: item.email,
          status: item.status,
          createdAt: item.createdAt,
          data: {
            orderId: refs.orderId,
            productId: refs.productId,
            product: refs.productName,
            customerEmail: item.email,
            issuedAt: item.createdAt,
            licenseType: "standard",
            seatLimit: item.activationLimit,
            extraSeats: 0,
            ...(item.expiresAt ? { expiresAt: item.expiresAt } : {}),
            lemonSqueezyInstances: refs.instances,
          },
        },
        sql`lower(${featureRecords.title}) = ${item.key.toLowerCase()}`,
      );
    },

    async upsertDiscount(item, productIds) {
      return upsertFeature(
        "discounts",
        item.sourceId,
        {
          title: item.code,
          status: item.active ? "active" : "inactive",
          createdAt: item.createdAt,
          data: {
            type: item.type,
            value: item.value,
            usageLimit: item.usageLimit,
            usageCount: item.usageCount,
            startsAt: item.startsAt ?? "",
            expiresAt: item.expiresAt ?? "",
            productIds: productIds === "all" ? ["all"] : productIds,
            productNames: productIds === "all" ? "All products" : "Selected products",
          },
        },
        sql`${featureRecords.title} = ${item.code}`,
      );
    },

    async upsertAffiliate(item) {
      return upsertFeature("affiliates", item.sourceId, {
        title: item.name,
        subtitle: item.email,
        status: item.status,
        createdAt: item.createdAt,
        data: {
          code: item.code,
          totalEarnings: item.totalEarnings,
          unpaidEarnings: item.unpaidEarnings,
          source,
        },
      });
    },

    async upsertSubscription(item, refs) {
      const status = item.billing ? "migration_pending" : "cancelled";
      return upsertFeature("subscriptions", item.sourceId, {
        title: item.productName,
        subtitle: item.email,
        status,
        createdAt: item.createdAt,
        data: {
          productId: refs.productId,
          variantId: refs.variantId,
          variantName: item.variantName,
          customerName: item.name,
          renewsAt: item.renewsAt,
          endsAt: item.endsAt,
          trialEndsAt: item.trialEndsAt,
          billingAnchor: item.billingAnchor,
          paymentProcessor: item.paymentProcessor,
          cardBrand: item.cardBrand,
          cardLast4: item.cardLast4,
          lemonSqueezyStatus: item.lsStatus,
          sourceStatus: item.lsStatus,
          sourceCustomerId: item.sourceCustomerId ?? null,
          sourcePaymentMethodId: item.sourcePaymentMethodId ?? null,
          migrationState: !item.billing
            ? "not_required"
            : (item.migrationState ??
              (item.paymentProcessor === "paypal" ? "needs_resubscribe" : "waiting_for_cards")),
        },
      });
    },

    async existingProductSlugs() {
      const rows = await db
        .select({ slug: products.slug })
        .from(products)
        .where(and(eq(products.storeId, storeId), eq(products.environment, environment)));
      return new Set(rows.map((row) => row.slug));
    },

    async existingAffiliateCodes() {
      const rows = await db.query.featureRecords.findMany({
        columns: { data: true },
        where: and(
          eq(featureRecords.userId, userId),
          eq(featureRecords.feature, "affiliates"),
        ),
      });
      return new Set(
        rows.map((row) => String(safeJson(row.data).code || "").toLowerCase()).filter(Boolean),
      );
    },
  };
}

function safeJson(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function parseFiles(value: string | null | undefined): ProductFile[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as ProductFile[]) : [];
  } catch {
    return [];
  }
}
