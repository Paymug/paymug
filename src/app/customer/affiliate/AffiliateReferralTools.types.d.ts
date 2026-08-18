import type { CustomerAffiliateProgram } from "@/lib/customer-affiliate-portal.types";

export type AffiliateEmbedFormat = "text" | "button" | "card";

export interface AffiliateReferralToolsProps {
  program: CustomerAffiliateProgram;
}

export interface AffiliateUsernameResponse {
  affiliate?: { data?: Record<string, unknown> };
  error?: string;
}
