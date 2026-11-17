import { cancelMigrationJob } from "@/lib/lemonsqueezy/import-job";
import { jsonError } from "@/lib/utils";
import { authorizeMigration } from "../auth";

export async function POST(request: Request) {
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id is required");
  const job = await cancelMigrationJob(auth.user.id, id);
  if (!job) return jsonError("Job not found", 404);
  return Response.json({ job });
}
