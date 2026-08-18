export interface AffiliateProgramPageProps {
  params: Promise<{ slug: string }>;
}

export interface AffiliateApplicationResponse {
  applied?: boolean;
  error?: string;
}

export interface AffiliateApplicationFormProps {
  storeSlug: string;
}

export type AffiliateEarningCadence = "one_time" | "monthly" | "annual";

export interface AffiliateEarningsCalculatorProps {
  currency: string;
  initialPriceCents: number;
  commissionType: "percentage" | "fixed";
  commissionValue: number;
  commissionDuration: "one_time" | "recurring";
}
