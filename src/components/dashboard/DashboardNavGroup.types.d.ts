import type { ReactNode } from "react";
import type { DashboardNavGroupConfig } from "../DashboardNav.types";

export interface DashboardNavGroupProps {
  group: DashboardNavGroupConfig;
  icon: ReactNode;
  pathname: string;
}
