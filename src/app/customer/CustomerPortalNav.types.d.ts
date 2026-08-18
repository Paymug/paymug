import type { PublicCustomer } from "@/lib/customer-auth.types";
import type { CustomerPortalBranding } from "@/lib/customer-portal.types";

export interface CustomerPortalNavProps {
  customer: PublicCustomer;
  affiliateEnabled: boolean;
  branding?: CustomerPortalBranding;
}
