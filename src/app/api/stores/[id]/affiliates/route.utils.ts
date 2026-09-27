import { getCloudflareContext } from "@opennextjs/cloudflare";
import type {
  AffiliateSignupMetadata,
  CloudflareAffiliateRequest,
} from "./route.types";

export async function getAffiliateSignupMetadata(
  request: Request,
): Promise<AffiliateSignupMetadata> {
  const { cf } = await getCloudflareContext({ async: true });
  const cloudflareRequest = request as CloudflareAffiliateRequest;
  return {
    city:
      cf?.city?.trim() ||
      String(cloudflareRequest.cf?.city || "").trim() ||
      request.headers.get("cf-ipcity")?.trim() ||
      "",
    country:
      cf?.country?.trim() ||
      String(cloudflareRequest.cf?.country || "").trim() ||
      request.headers.get("cf-ipcountry")?.trim() ||
      "",
    signupIp: request.headers.get("cf-connecting-ip")?.trim() || "",
  };
}
