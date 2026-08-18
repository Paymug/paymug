import type { FormEvent, ReactNode } from "react";
import type { DashboardFeatureOption } from "./DashboardFeaturePage.types";
import type { FeatureFormValues } from "./FeatureWorkspace.types";
import type { DashboardFeatureConfig } from "./DashboardFeaturePage.types";

export interface FeatureRecordFormProps {
  feature: DashboardFeatureConfig;
  values: FeatureFormValues;
  productOptions: DashboardFeatureOption[];
  editing: boolean;
  saving: boolean;
  error: string | null;
  inline?: boolean;
  /** `stack` = single column (drawers). Default `grid` = two columns on sm+. */
  layout?: "grid" | "stack";
  /** Content on the left side of the footer (e.g. Delete). */
  footerStart?: ReactNode;
  showCancel?: boolean;
  onSubmit(event: FormEvent<HTMLFormElement>): void;
  onClose(): void;
  onValueChange(name: string, value: string): void;
}
