import type { DashboardFeatureOption } from "./DashboardFeaturePage.types";

export interface DiscountValueInputProps {
  type: string;
  value: string;
  typeOptions: DashboardFeatureOption[];
  onTypeChange(value: string): void;
  onValueChange(value: string): void;
}
