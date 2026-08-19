import { getSessionUser } from "@/lib/auth";
import { importStoreBackup } from "@/lib/store-backup-import";
import { parseStoreBackup } from "@/lib/store-backup.utils";
import { jsonError } from "@/lib/utils";

const maximumBackupBytes = 25 * 1024 * 1024;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const declaredSize = Number(request.headers.get("content-length") || 0);
  if (declaredSize > maximumBackupBytes) {
    return jsonError("Backup file must be 25 MB or smaller", 413);
  }
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > maximumBackupBytes) {
      return jsonError("Backup file must be 25 MB or smaller", 413);
    }
    const backup = parseStoreBackup(JSON.parse(body) as unknown);
    const preserveIds = new URL(request.url).searchParams.get("preserveIds") === "true";
    return Response.json(
      await importStoreBackup(user.id, user.activeStoreId, backup, { preserveIds }),
    );
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not import backup",
      400,
    );
  }
}
