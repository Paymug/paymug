import type { CustomerPortalPurchase } from "@/lib/customer-portal.types";

export interface CustomerSeatAddOnProps {
  currency: string;
  seatAddOn: NonNullable<CustomerPortalPurchase["seatAddOn"]>;
  onCheckout(seats: number): void;
}
