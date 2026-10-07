import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { saveTablePreference } from "@/lib/table-preferences";
import { jsonError } from "@/lib/utils";

const tablePreferenceSchema = z.object({
  tableId: z.string().min(1).max(64),
  hidden: z.array(z.string().max(64)).max(64),
  widths: z.record(z.string().max(64), z.number().min(20).max(2000)),
});

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = tablePreferenceSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid preference");
  }
  await saveTablePreference(user.id, parsed.data.tableId, {
    hidden: parsed.data.hidden,
    widths: parsed.data.widths,
  });
  return Response.json({ ok: true });
}
