export interface TaxSettingsResponse {
  stripeConfigured: boolean;
  mode: "sandbox" | "live";
  enabled: boolean;
  paymentGateway?: string;
  taxStatus?: "active" | "pending" | "unknown";
  originCountry?: string;
  taxError?: string;
  error?: string;
}
