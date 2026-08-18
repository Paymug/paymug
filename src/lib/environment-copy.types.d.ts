import type { PayPalMode } from "./types";

export type EnvironmentCopyKind = "products" | "customers" | "campaigns";

export interface CopyEnvironmentRecordsInput {
  userId: string;
  storeId: string;
  sourceEnvironment: PayPalMode;
  targetEnvironment: PayPalMode;
  kind: EnvironmentCopyKind;
  ids: string[];
}

export interface CopyEnvironmentRecordsResult {
  copied: number;
  skipped: number;
}
