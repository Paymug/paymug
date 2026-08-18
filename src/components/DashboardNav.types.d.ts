import type {
  PayPalEnvironmentAvailability,
} from "@/lib/paypal-environment.types";
import type { PayPalMode } from "@/lib/types";

export interface DashboardNavProps {
  storeName: string;
  userName: string;
  environment: PayPalMode;
  environmentAvailability: PayPalEnvironmentAvailability;
  setupProgress: number;
  affiliatesEnabled: boolean;
  emailCampaignsEnabled: boolean;
}

export interface DashboardFeatureVisibility {
  affiliatesEnabled: boolean;
  emailCampaignsEnabled: boolean;
}

export type DashboardNavGroupId =
  | "store"
  | "email"
  | "affiliates"
  | "settings";

export interface DashboardNavItem {
  href: string;
  label: string;
  exact?: boolean;
}

export interface DashboardNavGroupConfig {
  id: DashboardNavGroupId;
  label: string;
  defaultOpen?: boolean;
  items: DashboardNavItem[];
}
