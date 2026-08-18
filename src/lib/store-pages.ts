import "server-only";

import {
  createFeatureRecord,
  deleteFeatureRecord,
  findFeatureRecord,
  listFeatureRecords,
  updateFeatureRecord,
} from "./feature-records";
import { slugify } from "./format";
import type { FeatureRecord } from "./feature-records.types";
import type {
  StorePage,
  StorePageInput,
  StorePageNavigation,
  StorePageStatus,
} from "./store-pages.types";
import type { PayPalMode } from "./types";

function mapStorePage(record: FeatureRecord): StorePage {
  return {
    id: record.id,
    userId: record.userId,
    storeId: String(record.data.storeId || ""),
    environment: record.environment,
    title: record.title,
    description: record.subtitle || "",
    slug: String(record.data.slug || ""),
    coverImageUrl: String(record.data.coverImageUrl || "") || undefined,
    content: String(record.data.content || ""),
    navigation: (["top", "footer"].includes(String(record.data.navigation))
      ? String(record.data.navigation)
      : "none") as StorePageNavigation,
    navigationLabel: String(record.data.navigationLabel || ""),
    status: (record.status === "published" ? "published" : "draft") as StorePageStatus,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function listStorePages(
  userId: string,
  storeId: string,
  environment: PayPalMode,
): Promise<StorePage[]> {
  return (await listFeatureRecords(userId, "pages", environment))
    .map(mapStorePage)
    .filter((page) => page.storeId === storeId);
}

export async function findStorePage(
  id: string,
  userId: string,
): Promise<StorePage | undefined> {
  const record = await findFeatureRecord(id, userId);
  return record?.feature === "pages" ? mapStorePage(record) : undefined;
}

export async function findStorePageBySlug(
  userId: string,
  storeId: string,
  environment: PayPalMode,
  slug: string,
): Promise<StorePage | undefined> {
  return (await listStorePages(userId, storeId, environment)).find(
    (page) => page.slug === slug,
  );
}

const reservedPageSlugs = new Set([
  "api",
  "affiliates",
  "buy",
  "checkout",
  "customer",
  "dashboard",
  "login",
  "og",
  "page-editor",
  "pages",
  "r",
  "s",
  "setup",
  "signup",
  "subscription",
  "unsubscribe",
]);

async function resolvePageSlug(
  userId: string,
  storeId: string,
  environment: PayPalMode,
  requestedSlug: string,
  currentPageId?: string,
): Promise<string> {
  const pages = await listStorePages(userId, storeId, environment);
  const slug = slugify(requestedSlug);
  if (!slug || reservedPageSlugs.has(slug)) {
    throw new Error("Choose a different page slug");
  }
  if (pages.some((page) => page.id !== currentPageId && page.slug === slug)) {
    throw new Error("This page URL is already in use");
  }
  return slug;
}

export async function createStorePage(
  userId: string,
  storeId: string,
  environment: PayPalMode,
  input: StorePageInput,
): Promise<StorePage> {
  const slug = await resolvePageSlug(
    userId,
    storeId,
    environment,
    input.slug,
  );
  const record = await createFeatureRecord(userId, "pages", {
    environment,
    title: input.title,
    subtitle: input.description,
    status: input.status,
    data: {
      storeId,
      slug,
      coverImageUrl: input.coverImageUrl || "",
      content: input.content,
      navigation: input.navigation,
      navigationLabel: input.navigationLabel,
    },
  });
  return mapStorePage(record);
}

export async function updateStorePage(
  page: StorePage,
  input: StorePageInput,
): Promise<StorePage | undefined> {
  const slug = await resolvePageSlug(
    page.userId,
    page.storeId,
    page.environment,
    input.slug,
    page.id,
  );
  const record = await updateFeatureRecord(page.id, page.userId, {
    title: input.title,
    subtitle: input.description,
    status: input.status,
    data: {
      storeId: page.storeId,
      slug,
      coverImageUrl: input.coverImageUrl || "",
      content: input.content,
      navigation: input.navigation,
      navigationLabel: input.navigationLabel,
    },
  });
  return record ? mapStorePage(record) : undefined;
}

export async function deleteStorePage(
  page: StorePage,
): Promise<void> {
  await deleteFeatureRecord(page.id, page.userId);
}
