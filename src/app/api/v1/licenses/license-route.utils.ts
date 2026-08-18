import { z } from "zod";
import { jsonError } from "@/lib/utils";
import type { LicenseAuthorityRequest } from "@/lib/app-license.types";

const authorityRequestSchema = z.object({
  licenseKey: z.string().trim().min(8).max(240),
  instanceId: z.string().uuid(),
  instanceUrl: z.string().url(),
  appVersion: z.string().trim().min(1).max(40),
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
