import type {
  PayPalEnvironmentAvailability,
} from "@/lib/paypal-environment.types";
import type { PayPalMode } from "@/lib/types";

export interface DashboardEnvironmentSwitchProps {
  environment: PayPalMode;
  availability: PayPalEnvironmentAvailability;
}

export interface EnvironmentResponse {
  environment?: PayPalMode;
  error?: string;
}
