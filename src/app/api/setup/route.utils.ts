import {
  getInitialSetupEnvironment,
  initialSetupHasRegisteredUser,
  migrateInitialSetupDatabase,
} from "@/lib/initial-setup";
import { jsonError } from "@/lib/utils";

async function setupUnavailableResponse(): Promise<Response | undefined> {
  if (!(await initialSetupHasRegisteredUser())) return undefined;
  return jsonError("Initial setup is no longer available", 404);
}

export async function migrateSetupDatabase(): Promise<Response> {
  try {
    const unavailable = await setupUnavailableResponse();
    if (unavailable) return unavailable;
    const result = await migrateInitialSetupDatabase();
    return Response.json({ complete: true, ...result });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not migrate the database",
      500,
    );
  }
}

export async function readSetupConfiguration(): Promise<Response> {
  try {
    const unavailable = await setupUnavailableResponse();
    if (unavailable) return unavailable;
    return Response.json(await getInitialSetupEnvironment());
  } catch (error) {
    return jsonError(
      error instanceof Error
        ? error.message
        : "Could not read the environment configuration",
      500,
    );
  }
}
