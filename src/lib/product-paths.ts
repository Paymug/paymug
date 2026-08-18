import type { Product } from "./types";

export function getProductPublicIdentifier(
  product: Pick<Product, "id" | "slug">,
): string {
  return product.slug.trim() || product.id;
}

export function getProductPublicPath(
  product: Pick<Product, "id" | "slug">,
): string {
  return `/buy/${encodeURIComponent(getProductPublicIdentifier(product))}`;
}
