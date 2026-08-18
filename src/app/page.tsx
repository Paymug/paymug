import { redirect } from "next/navigation";
import StorefrontPage from "./s/[slug]/page";
import {
  generateHomepageMetadata,
  getHomepageStoreSlug,
} from "./homepage-storefront.utils";

export const generateMetadata = generateHomepageMetadata;
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const slug = await getHomepageStoreSlug();
  if (!slug) redirect("/setup");

  return <StorefrontPage params={Promise.resolve({ slug })} />;
}
