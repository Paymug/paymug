import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { createApiKey } from "@/lib/api-keys";
import { listApiKeys } from "@/lib/feature-records";
import { jsonError } from "@/lib/utils";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  expiresAt: z.string().datetime().optional(),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  return Response.json({ keys: await listApiKeys(user.id) });
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid input");
  }
  const created = await createApiKey(
    user.id,
    parsed.data.name,
    parsed.data.expiresAt
  );
  return Response.json(created, { status: 201 });
}
