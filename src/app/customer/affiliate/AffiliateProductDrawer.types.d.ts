import type {
  CustomerAffiliateProduct,
  CustomerAffiliateProgram,
} from "@/lib/customer-affiliate-portal.types";

export interface AffiliateProductDrawerProps {
  product: CustomerAffiliateProduct;
  program: CustomerAffiliateProgram;
  onClose(): void;
}
