import type { Metadata } from "next";
import { getPrimaryStore } from "@/lib/stores";
import { buildAffiliateProgramMetadata } from "../s/[slug]/affiliates/page-metadata.utils";

export async function getAffiliateHomepageStoreSlug(): Promise<
  string | undefined
> {
  const store = await getPrimaryStore();
  return store?.affiliatesEnabled ? store.slug : undefined;
}

export async function generateAffiliateHomepageMetadata(): Promise<Metadata> {
  const slug = await getAffiliateHomepageStoreSlug();
  if (!slug) {
    return {
      title: "Affiliate program not found",
      robots: { index: false, follow: false },
    };
  }
  return buildAffiliateProgramMetadata(slug);
}
