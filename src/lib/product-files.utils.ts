import type { ProductFile } from "./product-files.types";

export function parseProductFiles(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isProductFile);
  } catch {
    return [];
  }
}

export function serializeProductFiles(files: ProductFile[]) {
  return JSON.stringify(files);
}

export function isProductFile(value: unknown): value is ProductFile {
  if (!value || typeof value !== "object") return false;
  const file = value as Partial<ProductFile>;
  return (
    typeof file.id === "string" &&
    typeof file.name === "string" &&
    typeof file.size === "number" &&
    Number.isFinite(file.size) &&
    file.size >= 0 &&
    typeof file.type === "string" &&
    typeof file.storageKey === "string"
  );
}

export function validateProductFileOwnership(
  files: ProductFile[],
  userId: string
) {
  if (files.length > 20) {
    throw new Error("A product can include up to 20 files");
  }
  const prefix = `delivery/${userId}/`;
  const uniqueIds = new Set<string>();
  for (const file of files) {
    if (!file.storageKey.startsWith(prefix) || uniqueIds.has(file.id)) {
      throw new Error("Invalid product file");
    }
    uniqueIds.add(file.id);
  }
}

export function formatProductFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.ceil(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function getProductFileDownloadUrl(orderId: string, fileId: string) {
  const params = new URLSearchParams({ orderId, fileId });
  return `/api/product-files/download?${params.toString()}`;
}
