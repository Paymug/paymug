import { getProductPublicPath } from "@/lib/product-paths";
import type { Product } from "@/lib/types";
import type { CheckoutSearchParams } from "@/lib/checkout-custom-data.types";

export function formatProductPageMoney(
  cents: number,
  currency = "USD",
): string {
  const hasFraction = Math.abs(cents) % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(cents / 100);
}

export function buildProductSlugRedirectPath(
  product: Pick<Product, "id" | "slug">,
  searchParams: CheckoutSearchParams,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      value.forEach((entry) => query.append(key, entry));
    } else if (value !== undefined) {
      query.set(key, value);
    }
  }
  const productPath = getProductPublicPath(product);
  const queryString = query.toString();
  return queryString ? `${productPath}?${queryString}` : productPath;
}
