import type { Product } from "@/lib/types";

export type ProductTransactionFeeSelection =
  | "none"
  | "fixed"
  | "percentage";

export interface ProductFormProps {
  product?: Product;
  storeCurrency: string;
  storeTransactionFeeType: "fixed" | "percentage";
  storeTransactionFeeValue: number;
}

export interface GitHubRepositoryOption {
  id: string;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  disabled?: boolean;
  disabledReason?: string;
}

export interface GitHubRepositoriesResponse {
  connected: boolean;
  login?: string;
  repositories: GitHubRepositoryOption[];
  error?: string;
}
