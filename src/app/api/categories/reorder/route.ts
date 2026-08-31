import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { reorderProductCategories } from "@/lib/product-categories";
import { jsonError } from "@/lib/utils";

const reorderSchema = z.object({
  categoryIds: z.array(z.string().min(1)).max(500),
});

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = reorderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid category order");
  }
  try {
    await reorderProductCategories(
      user.id,
      user.activeStoreId,
      parsed.data.categoryIds,
    );
    return Response.json({ reordered: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not reorder categories",
      400,
    );
  }
}
