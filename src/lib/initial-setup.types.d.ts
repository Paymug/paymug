export interface InitialSetupDatabaseResult {
  appliedMigrations: number;
  totalMigrations: number;
}

export interface InitialSetupEnvironmentItem {
  key: "AUTH_SECRET" | "ENCRYPTION_SECRET" | "NEXT_PUBLIC_APP_URL";
  description: string;
  configured: boolean;
}

export interface InitialSetupEnvironmentResult {
  complete: boolean;
  items: InitialSetupEnvironmentItem[];
}
