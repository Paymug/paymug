import { getSessionUser } from "@/lib/auth";
import {
  createProductCategory,
  listProductCategories,
} from "@/lib/product-categories";
import { jsonError } from "@/lib/utils";
import {
  productCategorySchema,
  resolveProductCategorySlug,
} from "./category-api.utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  return Response.json({
    categories: await listProductCategories(user.id, user.activeStoreId),
  });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = productCategorySchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid category");
  }
  try {
    const slug = await resolveProductCategorySlug(
      user.id,
      user.activeStoreId,
      parsed.data.slug,
    );
    const category = await createProductCategory(
      user.id,
      user.activeStoreId,
      { ...parsed.data, slug },
    );
    return Response.json({ category }, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not create category",
      409,
    );
  }
}
