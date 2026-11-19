import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getStoreById, updateStore } from "@/lib/stores";
import { normalizeRedirectDomain } from "@/lib/return-url";
import { jsonError } from "@/lib/utils";

const schema = z.object({
  allowedRedirectDomains: z.array(z.string().trim().max(253)).max(50),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const store = await getStoreById(user.activeStoreId, user.id);
  if (!store) return jsonError("Store not found", 404);
  return Response.json({ allowedRedirectDomains: store.allowedRedirectDomains });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid settings");
  const domains: string[] = [];
  for (const entry of parsed.data.allowedRedirectDomains) {
    if (!entry) continue;
    const normalized = normalizeRedirectDomain(entry);
    if (!normalized) {
      return jsonError(
        `"${entry}" is not a valid domain. Use example.com or *.example.com`,
      );
    }
    if (!domains.includes(normalized)) domains.push(normalized);
  }
  const store = await updateStore(user.activeStoreId, user.id, {
    allowedRedirectDomains: domains,
  });
  if (!store) return jsonError("Store not found", 404);
  return Response.json({ allowedRedirectDomains: store.allowedRedirectDomains });
}
