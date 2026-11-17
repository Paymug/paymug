import {
  advanceMigrationJob,
  getLatestMigrationJob,
  viewMigrationJob,
} from "@/lib/lemonsqueezy/import-job";
import { jsonError } from "@/lib/utils";
import { authorizeMigration } from "../auth";

/** GET reads the job (latest when no `id`). Does not advance it. */
export async function GET(request: Request) {
  const auth = await authorizeMigration(request, "read");
  if ("error" in auth) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  const job = id
    ? await viewMigrationJob(auth.user.id, id)
    : await getLatestMigrationJob(auth.user.id);
  if (id && !job) return jsonError("Job not found", 404);
  return Response.json({ job });
}

/** POST runs one chunk of work and returns progress. Call until `completed`. */
export async function POST(request: Request) {
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return jsonError("id is required");
  const job = await advanceMigrationJob(auth.user.id, id);
  if (!job) return jsonError("Job not found", 404);
  return Response.json({ job });
}
