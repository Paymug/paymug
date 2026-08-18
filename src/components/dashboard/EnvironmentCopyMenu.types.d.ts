import type { EnvironmentCopyKind } from "@/lib/environment-copy.types";
import type { PayPalMode } from "@/lib/types";

export interface EnvironmentCopyMenuProps {
  kind: EnvironmentCopyKind;
  selectedIds: string[];
  environment: PayPalMode;
  onCopied?(): void | Promise<void>;
}

export interface EnvironmentCopyResponse {
  copied?: number;
  skipped?: number;
  error?: string;
}
