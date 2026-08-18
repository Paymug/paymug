import type { Product } from "@/lib/types";
import type { ProductFile } from "@/lib/product-files.types";

export interface ProductFormSavePayload {
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  transactionFeeType: "fixed" | "percentage";
  transactionFeeValue: number;
  currency: string;
  status: "draft" | "published";
  deliveryContent?: string;
  productFiles: ProductFile[];
  generateLicense: boolean;
  licenseType: "standard" | "perpetual";
  licenseUpdatePeriodUnit?: "day" | "week" | "month" | "year" | null;
  licenseUpdatePeriodCount: number;
  billingType: "one_time" | "subscription";
  intervalUnit?: "week" | "month" | "year" | null;
  intervalCount: number;
  trialDays: number;
  githubRepoOwner?: string | null;
  githubRepoName?: string | null;
}

export type ProductAutosaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseProductAutosaveInput {
  initialProductId?: string;
  payload: ProductFormSavePayload;
  hasMeaningfulContent: boolean;
  onCreated(product: Product): void;
  onError(message: string): void;
  onSaved(): void;
}

export interface ProductSaveResponse {
  product?: Product;
  error?: string;
}
