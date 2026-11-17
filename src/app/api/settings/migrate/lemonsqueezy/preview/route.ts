import { z } from "zod";
import { previewImport } from "@/lib/lemonsqueezy/import-job";
import { jsonError } from "@/lib/utils";
import { authorizeMigration, lsErrorResponse } from "../auth";

const schema = z.object({
  apiKey: z.string().trim().min(20).max(4000),
  lsStoreId: z.string().trim().min(1).max(40),
  mode: z.enum(["test", "live"]),
});

export async function POST(request: Request) {
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request");
  try {
    return Response.json(
      await previewImport({
        ...parsed.data,
        userId: auth.user.id,
        storeId: auth.user.activeStoreId,
      }),
    );
  } catch (error) {
    return lsErrorResponse(error);
  }
}
