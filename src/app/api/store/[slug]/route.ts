import { findUserByStoreSlug, listProductsByUser } from "@/lib/db";
import { getStoreById } from "@/lib/stores";
import { jsonError } from "@/lib/utils";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  const user = await findUserByStoreSlug(slug);
  if (!user) return jsonError("Store not found", 404);
  const store = await getStoreById(user.activeStoreId, user.id);

  const products = (await listProductsByUser(
    user.id,
    user.activeStoreId,
    user.environment,
  ))
    .filter((p) => p.status === "published")
    .map(({
      deliveryContent: _,
      generateLicense: __,
      licenseType: _____,
      licenseUpdatePeriodUnit: ______,
      licenseUpdatePeriodCount: _______,
      githubRepoOwner: ___,
      githubRepoName: ____,
      ...p
    }) => p);

  return Response.json({
    store: {
      name: user.storeName,
      slug: user.storeSlug,
      description: store?.description || "",
      logoImageUrl: store?.logoImageUrl,
      coverImageUrl: user.storeCoverImageUrl,
    },
    products,
  });
}
