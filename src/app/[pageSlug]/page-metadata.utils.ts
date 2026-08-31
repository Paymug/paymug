import { generatePublicStorePageMetadata } from "../pages/[slug]/page-metadata.utils";
import type { RootStorePageProps } from "./page.types";
import { findProductCategoryBySlug } from "@/lib/product-categories";
import { getPrimaryStore } from "@/lib/stores";
import { buildPublicPageMetadata } from "@/lib/public-page-metadata";

export async function generateRootStorePageMetadata({ params }: RootStorePageProps) {
  const { pageSlug } = await params;
  const store = await getPrimaryStore();
  if (store) {
    const category = await findProductCategoryBySlug(store.id, pageSlug);
    if (category) {
      return buildPublicPageMetadata({
        title: `${category.name} — ${store.name}`,
        description:
          category.description ||
          `Browse ${category.name} products from ${store.name}.`,
        canonicalPath: `/${encodeURIComponent(category.slug)}`,
        siteName: store.name,
        imageUrl: store.coverImageUrl || store.logoImageUrl || "/og.png",
        imageAlt: category.name,
        keywords: [category.name, store.name],
      });
    }
  }
  return generatePublicStorePageMetadata({
    params: Promise.resolve({ slug: pageSlug }),
  });
}
