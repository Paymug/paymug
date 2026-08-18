import type {
  AffiliateSignupMetadata,
  CloudflareAffiliateRequest,
} from "./route.types";

export function getAffiliateSignupMetadata(
  request: Request,
): AffiliateSignupMetadata {
  const cloudflareRequest = request as CloudflareAffiliateRequest;
  return {
    city:
      String(cloudflareRequest.cf?.city || "").trim() ||
      request.headers.get("cf-ipcity")?.trim() ||
      "",
    country:
      String(cloudflareRequest.cf?.country || "").trim() ||
      request.headers.get("cf-ipcountry")?.trim() ||
      "",
    signupIp: request.headers.get("cf-connecting-ip")?.trim() || "",
  };
}
