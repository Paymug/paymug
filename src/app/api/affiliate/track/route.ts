import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  findAffiliateByCode,
  recordAffiliateClick,
} from "@/lib/commerce-features";
import { findProductById } from "@/lib/db";
import { getStoreById } from "@/lib/stores";
import { affiliateCookieMatchesStore } from "@/lib/affiliate-settings.utils";
import { jsonError } from "@/lib/utils";
import { requireProFeature } from "@/lib/pro-feature-access";
import { getProductPublicPath } from "@/lib/product-paths";

export async function POST(request: Request) {
  const denied = await requireProFeature("affiliates");
  if (denied) return denied;
  const body = (await request.json().catch(() => ({}))) as {
    productId?: string;
    ref?: string;
  };
  const productId = body.productId?.trim() || "";
  const ref = body.ref?.trim() || "";
  if (!productId || !ref) {
    return jsonError("productId and ref are required");
  }

  const product = await findProductById(productId);
  if (!product || product.status !== "published") {
    return jsonError("Product not available", 404);
  }
  const store = await getStoreById(product.storeId, product.userId);
  if (!store || !store.affiliatesEnabled) {
    return jsonError("Affiliates are not enabled for this store", 404);
  }

  const affiliate = await findAffiliateByCode(
    product.userId,
    ref,
    product.storeId,
    product.environment
  );
  if (!affiliate) {
    return jsonError("Affiliate not found", 404);
  }

  await recordAffiliateClick({
    userId: product.userId,
    storeId: product.storeId,
    affiliate,
    destination: `${getProductPublicPath(product)}?ref=${encodeURIComponent(ref)}`,
    referrer: request.headers.get("referer") || undefined,
  });

  const response = NextResponse.json({ ok: true });
  const existingCookie = (await cookies())
    .get("paymug_affiliate")
    ?.value.split(":");
  const hasAttributedAffiliate = affiliateCookieMatchesStore(
    existingCookie?.[0],
    product.userId,
    product.storeId
  );
  if (
    store.affiliateAttributionModel === "last_click" ||
    !hasAttributedAffiliate
  ) {
    response.cookies.set(
      "paymug_affiliate",
      `${product.storeId}:${ref}`,
      {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
        secure: process.env.NODE_ENV === "production",
      }
    );
  }
  return response;
}
