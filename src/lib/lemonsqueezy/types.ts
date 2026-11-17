export interface LsResource {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  relationships?: Record<string, { data?: unknown }>;
}

export interface LsPage {
  data: LsResource[];
  links?: { next?: string | null };
}

export type LsResourceKind =
  | "stores"
  | "products"
  | "variants"
  | "files"
  | "customers"
  | "orders"
  | "license-keys"
  | "license-key-instances"
  | "discounts"
  | "affiliates"
  | "subscriptions";

export type ImportStage =
  | "products"
  | "files"
  | "customers"
  | "orders"
  | "licenses"
  | "discounts"
  | "affiliates"
  | "subscriptions";

export const importStages: ImportStage[] = [
  "products",
  "files",
  "customers",
  "orders",
  "licenses",
  "discounts",
  "affiliates",
  "subscriptions",
];

/** Resources the seller may toggle in the preview. Files ride with products. */
export type ImportResource = ImportStage;

export interface ImportCounts {
  [stage: string]: {
    imported: number;
    skipped: number;
    failed: number;
  };
}

export interface ImportErrorEntry {
  stage: string;
  sourceId: string;
  message: string;
}
