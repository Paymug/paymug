import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  activateAppLicense,
  deactivateAppLicense,
  getAppLicenseStatus,
} from "@/lib/app-license";
import { jsonError } from "@/lib/utils";

const activationSchema = z.object({
  licenseKey: z.string().trim().min(8).max(240),
});

export async function GET() {
  if (!(await getSessionUser())) return jsonError("Unauthorized", 401);
  return Response.json({ license: await getAppLicenseStatus() });
}

export async function POST(request: Request) {
  if (!(await getSessionUser())) return jsonError("Unauthorized", 401);
  const parsed = activationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid license key");
  }
  try {
    return Response.json({
      license: await activateAppLicense(parsed.data.licenseKey),
    });
  } catch (error) {
    console.log("activeerr", error)
    return jsonError(
      error instanceof Error ? error.message : "Could not activate license",
      409,
    );
  }
}

export async function DELETE() {
  if (!(await getSessionUser())) return jsonError("Unauthorized", 401);
  try {
    return Response.json({ license: await deactivateAppLicense() });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not deactivate license",
      500,
    );
  }
}
