import { notFound } from "next/navigation";
import AffiliateProgramPage from "../s/[slug]/affiliates/page";
import {
  generateAffiliateHomepageMetadata,
  getAffiliateHomepageStoreSlug,
} from "./page.utils";

export const generateMetadata = generateAffiliateHomepageMetadata;
export const dynamic = "force-dynamic";

export default async function AffiliateHomepagePage() {
  const slug = await getAffiliateHomepageStoreSlug();
  if (!slug) notFound();

  return <AffiliateProgramPage params={Promise.resolve({ slug })} />;
}
