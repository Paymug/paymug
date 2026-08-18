import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { subscribeCheckoutCustomer } from "@/lib/commerce-features";
import { findUserByStoreSlug } from "@/lib/db";
import { resolveStorefrontEnvironment } from "@/lib/storefront-environment.utils";
import { jsonError } from "@/lib/utils";
import type { StoreSubscribeRouteContext } from "./route.types";

const subscribeSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().max(120).optional(),
});

export async function POST(
  req: Request,
  { params }: StoreSubscribeRouteContext
) {
  const { slug } = await params;
  const seller = await findUserByStoreSlug(slug);
  if (!seller) return jsonError("Store not found", 404);
  const viewer = await getSessionUser();
  const environment = resolveStorefrontEnvironment(
    seller.id,
    seller.environment,
    viewer?.id,
  );
  const parsed = subscribeSchema.safeParse(await req.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid email");
  }
  await subscribeCheckoutCustomer(
    seller.id,
    parsed.data.email,
    parsed.data.name,
    environment
  );
  return Response.json({ subscribed: true });
}
