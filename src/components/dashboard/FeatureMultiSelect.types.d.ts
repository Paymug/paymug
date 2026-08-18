import type { DashboardFeatureOption } from "./DashboardFeaturePage.types";

export interface FeatureMultiSelectProps {
  label: string;
  name: string;
  value: string;
  options: DashboardFeatureOption[];
  onChange(value: string): void;
}
