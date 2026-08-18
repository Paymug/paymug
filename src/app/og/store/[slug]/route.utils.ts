import { createSocialImageResponse } from "@/lib/social-image-response";
import { getStoreBySlug } from "@/lib/stores";
import type { StoreSocialImageRouteContext } from "./route.types";

export async function getStoreSocialImage(
  request: Request,
  context: StoreSocialImageRouteContext,
): Promise<Response> {
  const { slug } = await context.params;
  const store = await getStoreBySlug(slug);
  return createSocialImageResponse(
    store?.coverImageUrl || store?.logoImageUrl,
    request.url,
  );
}
