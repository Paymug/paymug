import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import {
  createStore,
  getActiveStoreForUser,
  listStoresByUser,
} from "@/lib/stores";
import { jsonError } from "@/lib/utils";
import { requireProFeature } from "@/lib/pro-feature-access";

const createStoreSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const [store, stores] = await Promise.all([
    getActiveStoreForUser(user.id, user.activeStoreId),
    listStoresByUser(user.id),
  ]);
  return Response.json({ store, stores });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = createStoreSchema.safeParse(await request.json());
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid store");
  }
  const existingStores = await listStoresByUser(user.id);
  if (existingStores.length > 0) {
    const denied = await requireProFeature("multi_store");
    if (denied) return denied;
  }
  try {
    const store = await createStore({
      userId: user.id,
      name: parsed.data.name,
    });
    return Response.json({ store }, { status: 201 });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not create store",
      409
    );
  }
}
