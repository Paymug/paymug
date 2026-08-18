import { getSessionUser } from "@/lib/auth";
import { checkForAppUpdate } from "@/lib/app-update";
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
