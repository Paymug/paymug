import { z } from "zod";
import { linkStripeSubscriptions } from "@/lib/lemonsqueezy/subscription-migration";
import { jsonError } from "@/lib/utils";
import { authorizeMigration } from "../../auth";

const schema = z.object({
  dryRun: z.boolean().default(true),
  recordIds: z.array(z.string().min(1)).max(500).optional(),
});

/** Dry run by default; send `dryRun: false` to create the Stripe subscriptions. */
export async function POST(request: Request) {
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid request");
  try {
    return Response.json(
      await linkStripeSubscriptions({
        userId: auth.user.id,
        storeId: auth.user.activeStoreId,
        environment: auth.user.environment,
        ...parsed.data,
      }),
    );
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Could not link", 409);
  }
}
