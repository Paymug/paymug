import { z } from "zod";
import { getLsStores } from "@/lib/lemonsqueezy/import-job";
import { jsonError } from "@/lib/utils";
import { authorizeMigration, lsErrorResponse } from "../auth";

const schema = z.object({ apiKey: z.string().trim().min(20).max(4000) });

/** Validates the key and lists Lemon Squeezy stores. The key is not stored. */
export async function POST(request: Request) {
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Enter your Lemon Squeezy API key");
  try {
    return Response.json({ stores: await getLsStores(parsed.data.apiKey) });
  } catch (error) {
    return lsErrorResponse(error);
  }
}
