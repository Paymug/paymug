import type { Metadata } from "next";
import { getProductDescriptionPlainText } from "@/components/product-description.utils";
import { getSessionUser } from "@/lib/auth";
import { findUserById } from "@/lib/db";
import { buildPublicPageMetadata } from "@/lib/public-page-metadata";
import { findStorePageBySlug } from "@/lib/store-pages";
import { resolveStorefrontEnvironment } from "@/lib/storefront-environment.utils";
import { getPrimaryStore } from "@/lib/stores";
import type { PublicStorePageProps } from "./page.types";
import { hasProFeature } from "@/lib/app-license";

export async function generatePublicStorePageMetadata({
  params,
}: PublicStorePageProps): Promise<Metadata> {
  if (!(await hasProFeature("pages"))) {
    return { title: "Page not found", robots: { index: false } };
  }
  const { slug } = await params;
  const store = await getPrimaryStore();
  if (!store) return { title: "Page not found", robots: { index: false } };
  const [viewer, seller] = await Promise.all([
    getSessionUser(),
    findUserById(store.userId),
  ]);
  if (!seller) return { title: "Page not found", robots: { index: false } };
  const environment = resolveStorefrontEnvironment(
    store.userId,
    seller.environment,
    viewer?.id,
  );
  const page = await findStorePageBySlug(
    store.userId,
    store.id,
    environment,
    slug,
  );
  if (!page || page.status !== "published") {
    return { title: "Page not found", robots: { index: false } };
  }
  const description =
    page.description ||
    getProductDescriptionPlainText(page.content) ||
    `${page.title} from ${store.name}.`;
  return buildPublicPageMetadata({
    title: `${page.title} — ${store.name}`,
    description,
    canonicalPath: `/${encodeURIComponent(page.slug)}`,
    siteName: store.name,
    imageUrl: page.coverImageUrl || "/og.png",
    imageAlt: page.title,
    keywords: [page.title, store.name],
  });
}
