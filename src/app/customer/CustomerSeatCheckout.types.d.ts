import type { CustomerPortalPurchase } from "@/lib/customer-portal.types";

export interface CustomerSeatCheckoutProps {
  purchase: CustomerPortalPurchase;
  seats: number;
  onBack(): void;
  onClose(): void;
}
