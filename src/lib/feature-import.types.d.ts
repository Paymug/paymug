import type {
  DashboardFeatureKey,
  FeatureRecord,
  FeatureRecordInput,
  FeatureRecordValue,
} from "./feature-records.types";

export type ImportableFeatureKey = Extract<
  DashboardFeatureKey,
  "customers" | "affiliates" | "subscribers"
>;

export type FeatureImportRow = Record<string, unknown>;

export interface PreparedFeatureImportRecord {
  rowNumber: number;
  identity: string;
  input: FeatureRecordInput;
}

export interface PreparedFeatureImportResult {
  records: PreparedFeatureImportRecord[];
  errors: string[];
}

export interface FeatureImportResponse {
  imported?: number;
  skipped?: number;
  failed?: number;
  errors?: string[];
  error?: string;
}

export type ImportedFeatureData = Record<string, FeatureRecordValue>;

export interface FeatureImportButtonProps {
  feature: ImportableFeatureKey;
  onImported(): Promise<void> | void;
}

export interface FeatureImportRecordIdentityInput {
  feature: ImportableFeatureKey;
  record: FeatureRecord;
}
