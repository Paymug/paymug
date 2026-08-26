import type { CustomerPortalPurchase } from "@/lib/customer-portal.types";

export type CustomerPurchaseModalTab = "payments" | "product" | "benefits";

export interface CustomerPurchaseModalProps {
  purchase: CustomerPortalPurchase;
  onClose(): void;
}
