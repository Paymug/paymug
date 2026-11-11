import type { PayPalMode } from "./types";

export interface PayPalCredentialConfig {
  clientId: string;
  clientSecret: string;
  mode: PayPalMode;
}

export interface StripeCredentialConfig {
  secretKey: string;
  webhookSecret?: string;
  mode: PayPalMode;
}

export interface SepayCredentialConfig {
  merchantId: string;
  secretKey: string;
  ipnSecret?: string;
  mode: PayPalMode;
}
