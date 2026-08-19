import type {
  AppAboutStatus,
  AppUpdateStatus,
} from "@/lib/app-about.types";
import type { StoreBackupImportResult } from "@/lib/store-backup.types";

export interface AboutPanelProps {
  status: AppAboutStatus;
}

export interface AboutUpdateResponse extends Partial<AppUpdateStatus> {
  error?: string;
}

export interface AboutBackupImportResponse
  extends Partial<StoreBackupImportResult> {
  error?: string;
}
