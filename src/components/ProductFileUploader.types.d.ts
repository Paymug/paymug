import type { ProductFile } from "@/lib/product-files.types";

export interface ProductFileUploaderProps {
  files: ProductFile[];
  onChange(files: ProductFile[]): void;
  onError(message: string): void;
}
