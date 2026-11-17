import { getSessionUser } from "@/lib/auth";
import {
  AppUpdateConfigError,
  checkForAppUpdate,
  dispatchAppUpdate,
} from "@/lib/app-update";
import { jsonError } from "@/lib/utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    return Response.json(await checkForAppUpdate());
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not check for updates",
      502,
    );
  }
}

export async function POST() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  try {
    return Response.json(await dispatchAppUpdate(), { status: 202 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not start the update";
    return jsonError(message, error instanceof AppUpdateConfigError ? 503 : 502);
  }
}
