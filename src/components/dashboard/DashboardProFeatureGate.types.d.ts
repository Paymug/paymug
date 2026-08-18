import type { ReactNode } from "react";
import type { AppLicenseStatus } from "@/lib/app-license.types";

export interface DashboardProFeatureGateProps {
  license: AppLicenseStatus;
  children: ReactNode;
}
