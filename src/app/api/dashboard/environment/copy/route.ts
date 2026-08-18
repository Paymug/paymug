import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { copyEnvironmentRecords } from "@/lib/environment-copy";
import { jsonError } from "@/lib/utils";
import { requireProFeature } from "@/lib/pro-feature-access";

const copySchema = z.object({
  kind: z.enum(["products", "customers", "campaigns"]),
  ids: z.array(z.string().min(1)).min(1).max(5000),
  targetEnvironment: z.enum(["sandbox", "live"]),
});

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = copySchema.safeParse(await req.json());
  if (!parsed.success) return jsonError("Invalid copy request");
  if (parsed.data.kind === "campaigns") {
    const denied = await requireProFeature("email_campaigns");
    if (denied) return denied;
  }
  if (parsed.data.targetEnvironment === user.environment) {
    return jsonError("Choose the other environment", 400);
  }

  const result = await copyEnvironmentRecords({
    userId: user.id,
    storeId: user.activeStoreId,
    sourceEnvironment: user.environment,
    targetEnvironment: parsed.data.targetEnvironment,
    kind: parsed.data.kind,
    ids: parsed.data.ids,
  });
  return Response.json(result);
}
