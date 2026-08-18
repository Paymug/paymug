import type { PublicCustomer } from "@/lib/customer-auth.types";

export interface CustomerProfileDetailsProps {
  customer: PublicCustomer;
}

export interface CustomerProfileDetailsResponse {
  error?: string;
}
