import { z } from "zod";
import { jsonError } from "@/lib/utils";
import type {
  LicenseAuthorityDeactivationRequest,
  LicenseAuthorityRequest,
} from "@/lib/app-license.types";

const authorityRequestSchema = z.object({
  licenseKey: z.string().trim().min(8).max(240),
  productId: z.string().uuid(),
  instanceId: z.string().uuid(),
  instanceUrl: z.string().url(),
  appVersion: z.string().trim().min(1).max(40),
});

const authorityDeactivationRequestSchema = z.object({
  productId: z.string().uuid(),
  instanceId: z.string().uuid(),
});

export async function parseLicenseAuthorityRequest(
  request: Request,
): Promise<LicenseAuthorityRequest | Response> {
  const parsed = authorityRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  return parsed.success
    ? parsed.data
    : jsonError(parsed.error?.issues[0]?.message || "Invalid request", 400);
}

export async function parseLicenseAuthorityDeactivationRequest(
  request: Request,
): Promise<LicenseAuthorityDeactivationRequest | Response> {
  const parsed = authorityDeactivationRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  return parsed.success
    ? parsed.data
    : jsonError(parsed.error?.issues[0]?.message || "Invalid request", 400);
}
