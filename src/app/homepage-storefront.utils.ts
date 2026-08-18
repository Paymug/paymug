import type { Metadata } from "next";
import { initialSetupHasRegisteredUser } from "@/lib/initial-setup";
import { getPrimaryStore } from "@/lib/stores";
import { buildStorefrontMetadata } from "./s/[slug]/page.utils";

export async function getHomepageStoreSlug(): Promise<string | undefined> {
  if (!(await initialSetupHasRegisteredUser())) return undefined;
  return (await getPrimaryStore())?.slug;
}

export async function generateHomepageMetadata(): Promise<Metadata> {
  const slug = await getHomepageStoreSlug();
  if (!slug) {
    return {
      title: "Initial setup",
      robots: { index: false, follow: false },
    };
  }
  return buildStorefrontMetadata(slug, "/");
}
