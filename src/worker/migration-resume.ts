/**
 * Resumes Lemon Squeezy migration jobs that stopped advancing (the seller
 * closed the page). The import code lives in the app, so the worker only finds
 * stalled jobs and asks the app to run them, authenticated with an HMAC of
 * AUTH_SECRET.
 */

const staleAfterMs = 2 * 60 * 1000;
const maxJobsPerTick = 3;

async function resumeToken(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("migration-resume"));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function resumeStaleMigrationJobs(
  env: CloudflareEnv,
  callApp: (request: Request) => Promise<Response>,
  now = new Date(),
): Promise<{ resumed: number; failed: number }> {
  const result = { resumed: 0, failed: 0 };
  if (!env.AUTH_SECRET) return result;
  const stale = await env.DB.prepare(
    "SELECT id FROM migration_jobs WHERE status = 'running' AND updated_at < ? ORDER BY updated_at ASC LIMIT ?",
  )
    .bind(new Date(now.getTime() - staleAfterMs).toISOString(), maxJobsPerTick)
    .all<{ id: string }>();
  if (!stale.results.length) return result;
  const token = await resumeToken(env.AUTH_SECRET);
  const origin = (env as { NEXT_PUBLIC_APP_URL?: string }).NEXT_PUBLIC_APP_URL || "https://localhost";
  for (const job of stale.results) {
    try {
      const response = await callApp(
        new Request(new URL("/api/internal/migrations/resume", origin), {
          method: "POST",
          headers: { "content-type": "application/json", "x-migration-resume": token },
          body: JSON.stringify({ id: job.id }),
        }),
      );
      if (response.ok) result.resumed += 1;
      else result.failed += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}
