import { z } from "zod";
import { getCustomerSession } from "@/lib/customer-auth";
import { getStoreById } from "@/lib/stores";
import { linkVisitorIdentity } from "@/lib/visitor-identities";

const visitorIdentitySchema = z.object({
  storeId: z.string().min(1).max(100),
  visitorId: z.string().min(8).max(100),
});

const identifySchema = z.object({
  email: z.string().email().max(240).optional(),
  storeId: z.string().min(1).max(100).optional(),
  visitorId: z.string().min(8).max(100).optional(),
  identities: z.array(visitorIdentitySchema).max(50).optional(),
});

export async function POST(request: Request) {
  const parsed = identifySchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return new Response(null, { status: 204 });

  const customer = await getCustomerSession();
  const email = customer?.email ?? parsed.data.email?.trim().toLowerCase();
  if (!email) return new Response(null, { status: 204 });

  const identities = [
    ...(parsed.data.identities ?? []),
    ...(parsed.data.storeId && parsed.data.visitorId
      ? [{ storeId: parsed.data.storeId, visitorId: parsed.data.visitorId }]
      : []),
  ];
  const unique = new Map(
    identities.map((identity) => [
      `${identity.storeId}:${identity.visitorId}`,
      identity,
    ]),
  );

  await Promise.all(
    [...unique.values()].map(async (identity) => {
      const store = await getStoreById(identity.storeId);
      if (!store || !store.analyticsEnabled) return;
      await linkVisitorIdentity({
        storeId: identity.storeId,
        visitorId: identity.visitorId,
        email,
      });
    }),
  );

  return new Response(null, { status: 204 });
}
