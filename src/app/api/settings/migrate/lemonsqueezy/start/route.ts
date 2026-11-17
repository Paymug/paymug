import { z } from "zod";
import { createMigrationJob } from "@/lib/lemonsqueezy/import-job";
import { jsonError } from "@/lib/utils";
import { authorizeMigration } from "../auth";

const schema = z.object({
  apiKey: z.string().trim().min(20).max(4000),
  lsStoreId: z.string().trim().min(1).max(40),
  mode: z.enum(["test", "live"]),
  stages: z.array(z.string()).max(20).optional(),
});

/** Creates the job. Progress is driven by POST /status (one chunk per call). */
export async function POST(request: Request) {
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request");
  try {
    const job = await createMigrationJob({
      ...parsed.data,
      userId: auth.user.id,
      storeId: auth.user.activeStoreId,
    });
    return Response.json({ job }, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not start", 409);
  }
}
