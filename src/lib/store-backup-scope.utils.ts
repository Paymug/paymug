import type { featureRecords } from "@/db/schema";

type FeatureRow = typeof featureRecords.$inferSelect;

export function selectStoreBackupFeatureRows(
  rows: FeatureRow[],
  storeId: string,
  productIds: Set<string>,
  orderIds: Set<string>,
  customerEmails: Set<string>,
): FeatureRow[] {
  const included = new Set<string>();
  const parsed = new Map<string, Record<string, unknown>>();
  for (const row of rows) {
    let data: Record<string, unknown> = {};
    try {
      const value = JSON.parse(row.data) as unknown;
      if (value && typeof value === "object" && !Array.isArray(value)) {
        data = value as Record<string, unknown>;
      }
    } catch {
      // Invalid legacy feature data cannot be reliably assigned to a store.
    }
    parsed.set(row.id, data);
    if (typeof data.storeId === "string") {
      if (data.storeId === storeId) included.add(row.id);
      continue;
    }
    const dataProductIds = Array.isArray(data.productIds)
      ? data.productIds.filter((id): id is string => typeof id === "string")
      : [];
    const dataOrderIds = Array.isArray(data.processedOrderIds)
      ? data.processedOrderIds.filter((id): id is string => typeof id === "string")
      : [];
    const recordEmails = [row.title, row.subtitle, data.customerEmail]
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().toLowerCase());
    if (
      (typeof data.productId === "string" && productIds.has(data.productId)) ||
      dataProductIds.some((id) => productIds.has(id)) ||
      (typeof data.orderId === "string" && orderIds.has(data.orderId)) ||
      (typeof data.latestOrderId === "string" && orderIds.has(data.latestOrderId)) ||
      dataOrderIds.some((id) => orderIds.has(id)) ||
      recordEmails.some((email) => customerEmails.has(email))
    ) {
      included.add(row.id);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      if (included.has(row.id)) continue;
      const data = parsed.get(row.id) || {};
      if (typeof data.storeId === "string" && data.storeId !== storeId) continue;
      if (
        (typeof data.affiliateId === "string" && included.has(data.affiliateId)) ||
        (typeof data.payoutReportId === "string" && included.has(data.payoutReportId))
      ) {
        included.add(row.id);
        changed = true;
      }
    }
  }
  return rows.filter((row) => included.has(row.id));
}
