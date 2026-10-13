import type { CustomerPortalPurchase } from "@/lib/customer-portal.types";

export interface CustomerSeatCheckoutProps {
  purchase: CustomerPortalPurchase;
  seats: number;
  onSeatsChange(seats: number): void;
  onBack(): void;
  onClose(): void;
}
