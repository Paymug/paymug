import type { Metadata } from "next";
import { getProductDescriptionPlainText } from "@/components/product-description.utils";
import { findProductById } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { isSubscriptionProduct } from "@/lib/product-billing";
import {
  buildPublicPageMetadata,
  getProductSocialImagePath,
} from "@/lib/public-page-metadata";
import { getStoreById } from "@/lib/stores";
import type { BuyPageProps } from "./page.types";

export async function generateProductMetadata({
  params,
}: BuyPageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await findProductById(productId);
  if (!product) {
    return {
      title: "Product not found",
      robots: { index: false, follow: false },
    };
  }
  const store = await getStoreById(product.storeId, product.userId);
  const storeName = store?.name || "Store";
  const productDescription = getProductDescriptionPlainText(
    product.description,
  );
  const billingLabel = isSubscriptionProduct(product)
    ? "subscription"
    : "digital product";
  const description = productDescription
    ? `${productDescription} Buy from ${storeName} for ${formatMoney(product.price, product.currency)}.`
    : `Buy ${product.name}, a ${billingLabel} from ${storeName}, for ${formatMoney(product.price, product.currency)}.`;
  const index =
    product.status === "published" && product.environment === "live";

  return buildPublicPageMetadata({
    title: `${product.name} by ${storeName}`,
    description,
    canonicalPath: `/buy/${encodeURIComponent(product.id)}`,
    siteName: storeName,
    imageUrl: getProductSocialImagePath(product.id),
    imageAlt: `${product.name} by ${storeName}`,
    keywords: [
      product.name,
      `${product.name} ${storeName}`,
      storeName,
      billingLabel,
      "digital product",
      "buy online",
    ],
    index,
  });
}
