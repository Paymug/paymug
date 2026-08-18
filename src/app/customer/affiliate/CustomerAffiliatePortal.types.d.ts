import type { PublicCustomer } from "@/lib/customer-auth.types";
import type {
  CustomerAffiliatePortalData,
  CustomerAffiliateProgram,
} from "@/lib/customer-affiliate-portal.types";

export interface CustomerAffiliatePortalProps {
  customer: PublicCustomer;
  data: CustomerAffiliatePortalData;
}

export interface CustomerAffiliateProgramProps {
  program: CustomerAffiliateProgram;
}

export interface CustomerAffiliateJoinProps {
  customer: PublicCustomer;
  program: CustomerAffiliateProgram;
}

export interface CustomerAffiliateApplicationResponse {
  applied?: boolean;
  error?: string;
}
