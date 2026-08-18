import type { FeatureRecord } from "@/lib/feature-records.types";
import type { Product } from "@/lib/types";
import type { DashboardFeatureConfig } from "./DashboardFeaturePage.types";

export type FeatureFormValues = Record<string, string>;

export interface FeatureWorkspaceProps {
  feature: DashboardFeatureConfig;
}

export interface FeatureWorkspaceState {
  records: FeatureRecord[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

export interface FeatureProductOptionsResponse {
  products?: Product[];
  error?: string;
}
