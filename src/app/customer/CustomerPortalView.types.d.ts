import type { PublicCustomer } from "@/lib/customer-auth.types";
import type { CustomerPortalData } from "@/lib/customer-portal.types";

export interface CustomerPortalViewProps {
  customer: PublicCustomer;
  portal: CustomerPortalData;
}
