import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { updateUser } from "@/lib/db";
import { jsonError } from "@/lib/utils";

const profileSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = profileSchema.safeParse(await req.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid profile");
  }
  try {
    const updated = await updateUser(user.id, {
      name: parsed.data.name,
    });
    return Response.json({ user: updated });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not save profile",
      409
    );
  }
}
