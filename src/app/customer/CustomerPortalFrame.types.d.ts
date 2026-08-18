import type { ReactNode } from "react";
import type { PublicCustomer } from "@/lib/customer-auth.types";
import type { CustomerPortalBranding } from "@/lib/customer-portal.types";

export interface CustomerPortalFrameProps {
  customer: PublicCustomer;
  title: string;
  affiliateEnabled?: boolean;
  branding?: CustomerPortalBranding;
  children: ReactNode;
}
