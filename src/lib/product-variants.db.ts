import "server-only";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { productVariants } from "@/db/schema";
import { getProductVariants } from "./db";
import { seatLimitToColumn, type ProductVariantRecord } from "./product-variants";
import type { VariantOverrideInput } from "./product-variants.schema";
import { uid } from "./utils";

function slugFor(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "variant"
  );
}

/** Maps API input to column values. Only keys present in `input` are returned. */
export function variantInputToColumns(input: VariantOverrideInput) {
  const set: Partial<typeof productVariants.$inferInsert> = {};
  const has = (key: keyof VariantOverrideInput) => input[key] !== undefined;
  if (has("name")) {
    set.name = input.name;
    set.slug = slugFor(input.name as string);
  }
  if (has("description")) set.description = input.description;
  if (has("sort")) set.sort = input.sort;
  if (has("status")) set.status = input.status;
  if (has("price")) set.price = input.price;
  if (has("customAmountEnabled")) set.customAmountEnabled = input.customAmountEnabled;
  if (has("minPrice")) set.minPrice = input.minPrice;
  if (has("suggestedPrice")) set.suggestedPrice = input.suggestedPrice;
  if (has("billingType")) set.billingType = input.billingType;
  if (has("intervalUnit")) set.intervalUnit = input.intervalUnit;
  if (has("intervalCount")) set.intervalCount = input.intervalCount;
  if (has("trialDays")) set.trialDays = input.trialDays;
  if (has("productFiles")) {
    set.productFiles =
      input.productFiles === null ? null : JSON.stringify(input.productFiles);
  }
  if (has("generateLicense")) set.generateLicense = input.generateLicense;
  if (has("licenseType")) set.licenseType = input.licenseType;
  if (input.inheritLicenseSeatLimit) set.licenseSeatLimit = null;
  else if (has("licenseSeatLimit")) {
    set.licenseSeatLimit = seatLimitToColumn(input.licenseSeatLimit);
  }
  if (has("licenseUpdatePeriodUnit")) set.licenseUpdatePeriodUnit = input.licenseUpdatePeriodUnit;
  if (has("licenseUpdatePeriodCount")) set.licenseUpdatePeriodCount = input.licenseUpdatePeriodCount;
  if (has("deliveryContent")) set.deliveryContent = input.deliveryContent;
  if (has("redirectUrl")) set.redirectUrl = input.redirectUrl || null;
  if (has("githubRepoOwner")) set.githubRepoOwner = input.githubRepoOwner;
  if (has("githubRepoName")) set.githubRepoName = input.githubRepoName;
  return set;
}

export async function listVariantsForProduct(productId: string) {
  return (await getProductVariants([productId])).get(productId) ?? [];
}

export async function createVariant(
  product: { id: string; userId: string; storeId: string; environment: "sandbox" | "live" },
  input: VariantOverrideInput & { name: string; price: number },
): Promise<ProductVariantRecord> {
  const db = await getDb();
  const existing = await listVariantsForProduct(product.id);
  const now = new Date().toISOString();
  const id = uid();
  await db.insert(productVariants).values({
    id,
    productId: product.id,
    userId: product.userId,
    storeId: product.storeId,
    environment: product.environment,
    name: input.name,
    slug: slugFor(input.name),
    sort: existing.length,
    status: "published",
    price: input.price,
    createdAt: now,
    updatedAt: now,
    ...variantInputToColumns({ ...input, name: undefined } as VariantOverrideInput),
  });
  return (await listVariantsForProduct(product.id)).find((v) => v.id === id)!;
}

export async function updateVariant(
  productId: string,
  variantId: string,
  input: VariantOverrideInput,
): Promise<ProductVariantRecord | undefined> {
  const db = await getDb();
  const columns = variantInputToColumns(input);
  const result = await db
    .update(productVariants)
    .set({ ...columns, updatedAt: new Date().toISOString() })
    .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
    .returning({ id: productVariants.id });
  if (!result.length) return undefined;
  return (await listVariantsForProduct(productId)).find((v) => v.id === variantId);
}

export async function deleteVariant(productId: string, variantId: string): Promise<boolean> {
  const db = await getDb();
  const result = await db
    .delete(productVariants)
    .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)))
    .returning({ id: productVariants.id });
  return result.length > 0;
}
