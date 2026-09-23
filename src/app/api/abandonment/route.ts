import { z } from "zod";
import { getDb } from "@/db";
import { abandonmentResponses } from "@/db/schema";
import { DEFAULT_ABANDONMENT_QUESTION } from "@/lib/abandonment";
import { subscribeCheckoutCustomer } from "@/lib/commerce-features";
import { findProductById } from "@/lib/db";
import { getStoreById } from "@/lib/stores";
import { uid } from "@/lib/utils";

const abandonmentSchema = z.object({
  storeId: z.string().min(1).max(100),
  productId: z.string().max(100).optional(),
  email: z.string().email().max(240).optional(),
  answer: z.string().max(500).optional(),
  marketingOptIn: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = abandonmentSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return new Response(null, { status: 204 });

  const store = await getStoreById(parsed.data.storeId);
  if (!store || !store.abandonmentPopupEnabled) {
    return new Response(null, { status: 204 });
  }

  const product = parsed.data.productId
    ? await findProductById(parsed.data.productId)
    : undefined;
  const environment = product?.environment ?? "sandbox";
  const email = parsed.data.email?.trim().toLowerCase() || null;
  const answer = parsed.data.answer?.trim().slice(0, 500) || null;
  const marketingOptIn = Boolean(parsed.data.marketingOptIn && email);

  const db = await getDb();
  await db.insert(abandonmentResponses).values({
    id: uid(),
    storeId: store.id,
    userId: store.userId,
    productId: parsed.data.productId ?? null,
    email,
    question: store.abandonmentQuestion || DEFAULT_ABANDONMENT_QUESTION,
    answer,
    marketingOptIn,
    environment,
    createdAt: new Date().toISOString(),
  });

  if (email && marketingOptIn) {
    await subscribeCheckoutCustomer(
      store.userId,
      email,
      undefined,
      environment,
    ).catch(() => {
      // Subscribing is best-effort and must not fail the survey submission.
    });
  }

  return new Response(null, { status: 204 });
}
