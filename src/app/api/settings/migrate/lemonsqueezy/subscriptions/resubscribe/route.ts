import { z } from "zod";
import { sendResubscribeEmails } from "@/lib/lemonsqueezy/resubscribe.server";
import { jsonError } from "@/lib/utils";
import { authorizeMigration } from "../../auth";

const schema = z.object({
  recordIds: z.array(z.string().min(1)).max(500).optional(),
  resend: z.boolean().optional(),
});

/** Emails PayPal subscribers a personal re-subscribe link. */
export async function POST(request: Request) {
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return jsonError("Invalid request");
  return Response.json(
    await sendResubscribeEmails({
      userId: auth.user.id,
      storeId: auth.user.activeStoreId,
      environment: auth.user.environment,
      requestUrl: request.url,
      ...parsed.data,
    }),
  );
}
