import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  findAffiliateByCode,
  recordAffiliateClick,
} from "@/lib/commerce-features";
import { findUserByStoreSlug } from "@/lib/db";
import { getRuntimeAbsoluteUrl } from "@/lib/runtime-env";
import { getStoreById } from "@/lib/stores";
import { affiliateCookieMatchesStore } from "@/lib/affiliate-settings.utils";
import type { AffiliateTrackingRouteContext } from "./route.types";
import { hasProFeature } from "@/lib/app-license";

export async function GET(
  req: Request,
  { params }: AffiliateTrackingRouteContext
) {
  const { storeSlug, code } = await params;
  const seller = await findUserByStoreSlug(storeSlug);
  const requestedDestination = new URL(req.url).searchParams.get("to");
  const destination =
    requestedDestination?.startsWith("/") &&
    !requestedDestination.startsWith("//")
      ? requestedDestination
      : "/";

  if (!(await hasProFeature("affiliates"))) {
    return NextResponse.redirect(
      await getRuntimeAbsoluteUrl(destination, req.url)
    );
  }

  if (!seller) {
    return NextResponse.redirect(await getRuntimeAbsoluteUrl("/", req.url));
  }

  const store = await getStoreById(seller.activeStoreId, seller.id);
  const affiliate = await findAffiliateByCode(
    seller.id,
    code,
    seller.activeStoreId,
    seller.environment
  );
  if (!affiliate) {
    return NextResponse.redirect(
      await getRuntimeAbsoluteUrl(destination, req.url)
    );
  }

  await recordAffiliateClick({
    userId: seller.id,
    storeId: seller.activeStoreId,
    affiliate,
    destination,
    referrer: req.headers.get("referer") || undefined,
  });

  const response = NextResponse.redirect(
    await getRuntimeAbsoluteUrl(destination, req.url)
  );
  const existingAffiliateCookie = (await cookies())
    .get("paymug_affiliate")
    ?.value.split(":");
  const hasAttributedAffiliate = affiliateCookieMatchesStore(
    existingAffiliateCookie?.[0],
    seller.id,
    seller.activeStoreId
  );
  if (
    store?.affiliateAttributionModel === "last_click" ||
    !hasAttributedAffiliate
  ) {
    response.cookies.set(
      "paymug_affiliate",
      `${seller.activeStoreId}:${String(affiliate.data.code || code)}`,
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
