import type { FeatureRecord } from "@/lib/feature-records.types";

export interface SubscriptionsViewProps {
  records: FeatureRecord[];
  onEdit(record: FeatureRecord): void;
  onDelete(record: FeatureRecord): void;
}
