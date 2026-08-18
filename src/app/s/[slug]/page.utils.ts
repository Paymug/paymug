import type { Metadata } from "next";
import { findUserByStoreSlug } from "@/lib/db";
import {
  buildPublicPageMetadata,
  getStoreSocialImagePath,
} from "@/lib/public-page-metadata";
import { getStoreById } from "@/lib/stores";
import type { StorefrontPageProps } from "./page.types";

export async function generateStorefrontMetadata({
  params,
}: StorefrontPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildStorefrontMetadata(
    slug,
    "/",
  );
}

export async function buildStorefrontMetadata(
  slug: string,
  canonicalPath: string,
): Promise<Metadata> {
  const seller = await findUserByStoreSlug(slug);
  if (!seller) {
    return {
      title: "Store not found",
      robots: { index: false, follow: false },
    };
  }
  const store = await getStoreById(seller.activeStoreId, seller.id);
  const storeName = store?.name || seller.storeName;
  const description =
    store?.description.trim() ||
    `Shop digital products, downloads, and subscriptions from ${storeName}.`;

  return buildPublicPageMetadata({
    title: `${storeName} — Digital Products`,
    description,
    canonicalPath,
    siteName: storeName,
    imageUrl: getStoreSocialImagePath(slug),
    imageAlt: `${storeName} store`,
    keywords: [
      storeName,
      `${storeName} products`,
      "digital products",
      "digital downloads",
      "online store",
    ],
  });
}
