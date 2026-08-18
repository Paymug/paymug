import type {
  AppAboutStatus,
  AppUpdateStatus,
} from "@/lib/app-about.types";

export interface AboutPanelProps {
  status: AppAboutStatus;
}

export interface AboutUpdateResponse extends Partial<AppUpdateStatus> {
  error?: string;
}
