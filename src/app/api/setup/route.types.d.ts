import type {
  InitialSetupDatabaseResult,
  InitialSetupEnvironmentResult,
} from "@/lib/initial-setup.types";

export interface InitialSetupMigrationResponse
  extends InitialSetupDatabaseResult {
  complete: true;
}

export type InitialSetupConfigurationResponse = InitialSetupEnvironmentResult;
