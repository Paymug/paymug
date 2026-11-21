import type { FeatureRecord } from "@/lib/feature-records.types";

export interface SubscriptionsViewProps {
  records: FeatureRecord[];
  onCreate?(): void;
  createLabel?: string;
  onEdit(record: FeatureRecord): void;
  onDelete(record: FeatureRecord): void;
}
