import PublicStorePage from "../pages/[slug]/page";
import { generateRootStorePageMetadata } from "./page-metadata.utils";
import type { RootStorePageProps } from "./page.types";
import { StoreCategoryPage } from "@/components/StoreCategoryPage";
import { findProductCategoryBySlug } from "@/lib/product-categories";
import { getPrimaryStore } from "@/lib/stores";

export const generateMetadata = generateRootStorePageMetadata;

export default async function RootStorePage({ params }: RootStorePageProps) {
  const { pageSlug } = await params;
  const store = await getPrimaryStore();
  if (store) {
    const category = await findProductCategoryBySlug(store.id, pageSlug);
    if (category) {
      return <StoreCategoryPage store={store} category={category} />;
    }
  }
  return <PublicStorePage params={Promise.resolve({ slug: pageSlug })} />;
}
