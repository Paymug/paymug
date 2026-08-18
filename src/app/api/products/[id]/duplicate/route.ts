import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { duplicateProduct } from "@/lib/product-duplication";
import { jsonError } from "@/lib/utils";
import type { DuplicateProductRouteContext } from "./route.types";

const duplicateSchema = z.object({
  name: z.string().trim().min(1).max(120),
});

export async function POST(
  request: Request,
  { params }: DuplicateProductRouteContext,
) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);

  const parsed = duplicateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid product name");
  }
  const { id } = await params;
  const product = await duplicateProduct(
    id,
    user.id,
    parsed.data.name,
    user.environment
  );
  if (!product) return jsonError("Product not found", 404);
  return Response.json({ product }, { status: 201 });
}
