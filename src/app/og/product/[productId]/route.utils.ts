import { findProductById } from "@/lib/db";
import { createSocialImageResponse } from "@/lib/social-image-response";
import { getStoreById } from "@/lib/stores";
import type { ProductSocialImageRouteContext } from "./route.types";

export async function getProductSocialImage(
  request: Request,
  context: ProductSocialImageRouteContext,
): Promise<Response> {
  const { productId } = await context.params;
  const product = await findProductById(productId);
  const publicProduct =
    product?.status === "published" && product.environment === "live"
      ? product
      : undefined;
  const store = publicProduct
    ? await getStoreById(publicProduct.storeId, publicProduct.userId)
    : undefined;
  return createSocialImageResponse(
    publicProduct?.imageUrl || store?.coverImageUrl || store?.logoImageUrl,
    request.url,
  );
}
