import type { InitialSetupEnvironmentItem } from "@/lib/initial-setup.types";

export type InitialSetupStepStatus =
  | "pending"
  | "loading"
  | "complete"
  | "needs_action"
  | "error";

export interface InitialSetupMigrationResponse {
  complete: true;
  appliedMigrations: number;
  totalMigrations: number;
  error?: string;
}

export interface InitialSetupConfigurationResponse {
  complete: boolean;
  items: InitialSetupEnvironmentItem[];
  error?: string;
}

export interface InitialSetupStepIndicatorProps {
  number: number;
  status: InitialSetupStepStatus;
}
