import { isValidMigrationResumeToken } from "@/lib/lemonsqueezy/resume-token";
import { advanceMigrationJobById } from "@/lib/lemonsqueezy/import-job";
import { getRuntimeEnvValue } from "@/lib/runtime-env";
import { jsonError } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Called by the cron worker only. Runs chunks of one stalled job for ~20s. */
export async function POST(request: Request) {
  const secret = await getRuntimeEnvValue("AUTH_SECRET");
  if (!secret || !isValidMigrationResumeToken(request.headers.get("x-migration-resume"), secret)) {
    return jsonError("Unauthorized", 401);
  }
  const body = (await request.json().catch(() => null)) as { id?: unknown } | null;
  if (typeof body?.id !== "string") return jsonError("id is required");
  const job = await advanceMigrationJobById(body.id, 20_000);
  if (!job) return jsonError("Job not found", 404);
  return Response.json({ job: { id: job.id, status: job.status, stage: job.stage } });
}
