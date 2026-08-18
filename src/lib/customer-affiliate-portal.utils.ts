import type { ChartPoint } from "@/components/dashboard/charts.types";
import type { FeatureRecord } from "./feature-records.types";

export function createAffiliateCountSeries(
  records: FeatureRecord[],
  days: number,
): ChartPoint[] {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - (days - index - 1));
    const nextDate = new Date(date);
    nextDate.setUTCDate(date.getUTCDate() + 1);
    return {
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
      date: date.toISOString(),
      value: records.filter((record) => {
        const timestamp = new Date(record.createdAt).getTime();
        return timestamp >= date.getTime() && timestamp < nextDate.getTime();
      }).length,
    };
  });
}

export function isCustomerAffiliateRecord(
  record: FeatureRecord,
  affiliateId: string,
  storeId: string,
): boolean {
  return (
    record.data.affiliateId === affiliateId &&
    (!record.data.storeId || record.data.storeId === storeId)
  );
}
