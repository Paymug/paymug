import { generatePublicStorePageMetadata } from "../pages/[slug]/page-metadata.utils";
import type { RootStorePageProps } from "./page.types";

export async function generateRootStorePageMetadata({ params }: RootStorePageProps) {
  const { pageSlug } = await params;
  return generatePublicStorePageMetadata({
    params: Promise.resolve({ slug: pageSlug }),
  });
}
