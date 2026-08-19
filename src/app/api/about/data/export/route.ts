import { getSessionUser } from "@/lib/auth";
import { exportStoreBackup } from "@/lib/store-backup-export";
import { jsonError } from "@/lib/utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const backup = await exportStoreBackup(user.id);
  const date = backup.exportedAt.slice(0, 10);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="paymug-store-backup-${date}.json"`,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
