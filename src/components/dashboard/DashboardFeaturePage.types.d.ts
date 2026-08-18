import type {
  DashboardFeatureKey,
  FeatureRecord,
} from "@/lib/feature-records.types";

export type DashboardFeatureFieldType =
  | "text"
  | "email"
  | "number"
  | "date"
  | "textarea"
  | "select"
  | "multi-select";

export interface DashboardFeatureOption {
  label: string;
  value: string;
}

export interface DashboardFeatureField {
  name: string;
  label: string;
  type: DashboardFeatureFieldType;
  source: "title" | "subtitle" | "status" | "data";
  required?: boolean;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: DashboardFeatureOption[];
  optionsSource?: "products";
}

export interface DashboardFeatureListField {
  label: string;
  source: "title" | "subtitle" | "status" | "data";
  name?: string;
}

export interface DashboardFeatureConfig {
  key: DashboardFeatureKey | "api-keys";
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  createLabel: string;
  allowCreate: boolean;
  allowImport?: boolean;
  fields: DashboardFeatureField[];
  listFields: DashboardFeatureListField[];
}

export interface DashboardFeaturePageProps {
  feature: DashboardFeatureConfig;
}

export interface FeatureWorkspaceProps {
  feature: DashboardFeatureConfig;
}

export interface FeatureRecordsResponse {
  records?: FeatureRecord[];
  record?: FeatureRecord;
  error?: string;
}
