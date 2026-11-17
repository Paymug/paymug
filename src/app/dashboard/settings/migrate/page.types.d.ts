export interface LsStoreOption {
  id: string;
  name: string;
  currency: string;
  url: string;
}

export interface MigratePreview {
  environment: "sandbox" | "live";
  counts: Record<string, number>;
  alreadyImportedProducts: number;
  notes?: string[];
  conflicts: { productSlugs: string[]; discountCodes: string[] };
}

export interface MigrateJob {
  id: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  stage: string;
  environment: "sandbox" | "live";
  counts: Record<string, { imported: number; skipped: number; failed: number }>;
  errorCount: number;
  errors: Array<{ stage: string; sourceId: string; message: string }>;
  stages: string[];
}
