import type { Metadata } from "next";
import {
  buildPublicPageMetadata,
  getStoreSocialImagePath,
} from "@/lib/public-page-metadata";
import { getStoreBySlug } from "@/lib/stores";
import { getAffiliateCommissionSummary } from "./affiliate-program.utils";
import type { AffiliateProgramPageProps } from "./page.types";
import { hasProFeature } from "@/lib/app-license";

export async function generateAffiliateProgramMetadata({
  params,
}: AffiliateProgramPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildAffiliateProgramMetadata(slug);
}

export async function buildAffiliateProgramMetadata(
  slug: string,
): Promise<Metadata> {
  if (!(await hasProFeature("affiliates"))) {
    return {
      title: "Affiliate program not found",
      robots: { index: false, follow: false },
    };
  }
  const store = await getStoreBySlug(slug);
  if (!store?.affiliatesEnabled) {
    return {
      title: "Affiliate program not found",
      robots: { index: false, follow: false },
    };
  }
  const description = `Join the ${store.name} affiliate program. ${getAffiliateCommissionSummary(store)}`;

  return buildPublicPageMetadata({
    title: `Join the ${store.name} Affiliate Program`,
    description,
    canonicalPath: "/affiliates",
    siteName: store.name,
    imageUrl: getStoreSocialImagePath(slug),
    imageAlt: `${store.name} affiliate program`,
    keywords: [
      `${store.name} affiliate program`,
      `${store.name} affiliates`,
      "affiliate program",
      "earn commission",
      "product affiliate program",
    ],
  });
}
