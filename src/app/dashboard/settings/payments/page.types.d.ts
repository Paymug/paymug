import type { PayPalMode } from "@/lib/types";
import type { ReactNode } from "react";

export interface PaymentProviderResponse {
  provider: "paypal" | "stripe";
  error?: string;
}

export interface PayPalWebhookSetupResponse {
  webhookId?: string;
  webhookUrl: string;
  webhookStatus: "active" | "manual_required" | "error";
  webhookError?: string;
  eventTypes?: string[];
  reconciliation?: {
    checked: number;
    reconciled: number;
    failed: number;
  };
  error?: string;
}

export interface PayPalConnectionResponse {
  connected: boolean;
  clientId?: string;
  mode: PayPalMode;
  connectedAt?: string;
  webhookId?: string;
  webhookUrl?: string;
  webhookStatus?:
    | "not_configured"
    | "active"
    | "manual_required"
    | "error";
  webhookError?: string;
  requiredEnvVars?: string[];
  configuredEnvVars?: string[];
  missingEnvVars?: string[];
  error?: string;
}

export interface StripeConnectionResponse {
  connected: boolean;
  accountId?: string;
  mode: PayPalMode;
  connectedAt?: string;
  webhookConfigured?: boolean;
  webhookUrl?: string;
  requiredEnvVars?: string[];
  configuredEnvVars?: string[];
  missingEnvVars?: string[];
  error?: string;
}

export interface StripeConnectionCardProps {
  mode: PayPalMode;
  onStatusChange?(connected: boolean): void;
}

export interface PayPalConnectionCardProps {
  mode: PayPalMode;
  onStatusChange?(connected: boolean): void;
}

export interface PaymentSetupSectionProps {
  stepNumber: number;
  title: string;
  description: string;
  complete: boolean;
  defaultOpen?: boolean;
  children: ReactNode;
}
