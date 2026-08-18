import PublicStorePage from "../pages/[slug]/page";
import { generateRootStorePageMetadata } from "./page-metadata.utils";
import type { RootStorePageProps } from "./page.types";

export const generateMetadata = generateRootStorePageMetadata;

export default async function RootStorePage({ params }: RootStorePageProps) {
  const { pageSlug } = await params;
  return <PublicStorePage params={Promise.resolve({ slug: pageSlug })} />;
}
