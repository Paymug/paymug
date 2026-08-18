import type { PayPalMode } from "./types";

export type PayPalEnvironmentAvailability = Record<PayPalMode, boolean>;

export interface PayPalEnvironmentState {
  active: PayPalMode;
  availability: PayPalEnvironmentAvailability;
}
