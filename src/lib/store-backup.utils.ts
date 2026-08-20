import { uid } from "./utils";
import type { StoreBackupFile } from "./store-backup.types";
import type { PayPalMode } from "./types";

const backupFormat = "paymug-store-backup";
const backupVersion = 2;
const maximumBackupRecords = 100_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function assertBackupRows(value: unknown, name: string): asserts value is Array<Record<string, unknown>> {
  if (!Array.isArray(value)) throw new Error(`Backup ${name} must be an array`);
  if (value.some((row) => !isRecord(row) || typeof row.id !== "string" || !row.id)) {
    throw new Error(`Backup ${name} contains an invalid record`);
  }
  const ids = value.map((row) => (row as Record<string, unknown>).id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`Backup ${name} contains duplicate IDs`);
  }
}

export function parseStoreBackup(value: unknown): StoreBackupFile {
  if (
    !isRecord(value) ||
    value.format !== backupFormat ||
    (value.version !== 1 && value.version !== backupVersion)
  ) {
    throw new Error("Select a supported Paymug store backup file");
  }
  if (!isRecord(value.data)) throw new Error("Backup data is missing");
  if (value.version === 1) {
    assertBackupRows(value.data.stores, "stores");
    if (value.data.stores.length !== 1) {
      throw new Error("Backup must contain exactly one source store");
    }
  } else if (
    typeof value.sourceStoreId !== "string" ||
    !value.sourceStoreId ||
    typeof value.sourceStoreSlug !== "string" ||
    !value.sourceStoreSlug
  ) {
    throw new Error("Backup source store metadata is missing");
  }
  assertBackupRows(value.data.products, "products");
  assertBackupRows(value.data.orders, "orders");
  assertBackupRows(value.data.checkoutReminders, "checkout reminders");
  assertBackupRows(value.data.featureRecords, "feature records");
  assertBackupRows(value.data.customers, "customers");
  const totalRecords =
    value.data.products.length +
    value.data.orders.length +
    value.data.checkoutReminders.length +
    value.data.featureRecords.length +
    value.data.customers.length;
  if (totalRecords > maximumBackupRecords) {
    throw new Error(`Backup contains more than ${maximumBackupRecords.toLocaleString()} records`);
  }
  return value as unknown as StoreBackupFile;
}

export function createStoreBackupIdMap(
  ids: string[],
  preserveIds: boolean,
): Map<string, string> {
  return new Map(ids.map((id) => [id, preserveIds ? id : uid()]));
}

export function createImportedSlug(
  sourceSlug: string,
  importedId: string,
  usedSlugs: Set<string>,
): string {
  const base = sourceSlug.trim() || "imported";
  let candidate = `${base}-${importedId.slice(0, 6).toLowerCase()}`;
  let suffix = 2;
  while (usedSlugs.has(candidate)) {
    candidate = `${base}-${importedId.slice(0, 6).toLowerCase()}-${suffix}`;
    suffix += 1;
  }
  usedSlugs.add(candidate);
  return candidate;
}

export function remapStoreBackupData(
  value: unknown,
  currentStoreId: string,
  currentEnvironment: PayPalMode,
  maps: {
    products: Map<string, string>;
    orders: Map<string, string>;
    features: Map<string, string>;
    customers: Map<string, string>;
  },
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) =>
      remapStoreBackupData(item, currentStoreId, currentEnvironment, maps),
    );
  }
  if (!isRecord(value)) return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "storeId") {
      result[key] = currentStoreId;
      continue;
    }
    if (key === "environment") {
      result[key] = currentEnvironment;
      continue;
    }
    if (typeof item === "string") {
      const map =
        key === "productId"
          ? maps.products
          : key === "orderId" || key === "latestOrderId"
            ? maps.orders
            : key === "affiliateId" || key === "payoutReportId"
              ? maps.features
              : key === "customerId"
                ? maps.customers
                : undefined;
      result[key] = map?.get(item) || item;
      continue;
    }
    if (Array.isArray(item) && (key === "productIds" || key === "processedOrderIds")) {
      const map = key === "productIds" ? maps.products : maps.orders;
      result[key] = item.map((id) => (typeof id === "string" ? map.get(id) || id : id));
      continue;
    }
    result[key] = remapStoreBackupData(
      item,
      currentStoreId,
      currentEnvironment,
      maps,
    );
  }
  return result;
}

export function replaceStoreBackupUrlReferences(
  value: string,
  replacements: Map<string, string>,
): string {
  let result = value;
  for (const [source, target] of replacements) {
    result = result
      .replaceAll(source, target)
      .replaceAll(encodeURIComponent(source), encodeURIComponent(target));
  }
  return result;
}
