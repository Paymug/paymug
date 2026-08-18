import type { CustomerPortalPurchase } from "@/lib/customer-portal.types";

export type CustomerPurchaseModalTab = "payments" | "product";

export interface CustomerPurchaseModalProps {
  purchase: CustomerPortalPurchase;
  onClose(): void;
}
