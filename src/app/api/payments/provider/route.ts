import { z } from "zod";
import { getSessionUser } from "@/lib/auth";
import { getStoreById, updateStore } from "@/lib/stores";
import { jsonError } from "@/lib/utils";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const store = await getStoreById(user.activeStoreId, user.id);
  if (!store) return jsonError("Store not found", 404);
  return Response.json({ provider: store.paymentGateway });
}

const providerSchema = z.object({
  provider: z.enum(["paypal", "stripe"]),
});

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return jsonError("Unauthorized", 401);
  const parsed = providerSchema.safeParse(await request.json());
  if (!parsed.success) return jsonError("Invalid payment provider");
  const store = await updateStore(user.activeStoreId, user.id, {
    paymentGateway: parsed.data.provider,
  });
  if (!store) return jsonError("Store not found", 404);
  return Response.json({ provider: store.paymentGateway });
}
