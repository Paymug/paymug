export interface ProductFile {
  id: string;
  name: string;
  size: number;
  type: string;
  storageKey: string;
}

export type ProductFileUploadKind = "description" | "delivery";

export interface ProductFileUploadResponse {
  file?: ProductFile;
  url?: string;
  error?: string;
}
