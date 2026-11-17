import { z } from "zod";
import { LemonSqueezyClient } from "@/lib/lemonsqueezy/client";
import {
  listMigrationSubscriptions,
  markLemonSqueezyCancelled,
} from "@/lib/lemonsqueezy/subscription-migration";
import { isReadyToCancelOnLemonSqueezy } from "@/lib/lemonsqueezy/subscription-state";
import { jsonError } from "@/lib/utils";
import { authorizeMigration } from "../../auth";

const schema = z.object({
  apiKey: z.string().trim().min(20).max(4000),
  recordIds: z.array(z.string().min(1)).min(1).max(100),
});

/**
 * Cancels the Lemon Squeezy copy of subscriptions that already bill through
 * Paymug. Uses the key sent with this request only; nothing is stored.
 */
export async function POST(request: Request) {
  const auth = await authorizeMigration(request, "write");
  if ("error" in auth) return auth.error;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request");
  const rows = await listMigrationSubscriptions(
    auth.user.id,
    auth.user.activeStoreId,
    auth.user.environment,
  );
  const client = new LemonSqueezyClient({ apiKey: parsed.data.apiKey });
  const cancelled: string[] = [];
  const skipped: Array<{ recordId: string; reason: string }> = [];
  const failed: Array<{ recordId: string; message: string }> = [];
  for (const recordId of parsed.data.recordIds) {
    const row = rows.find((candidate) => candidate.id === recordId);
    if (!row || !row.lsSourceId) {
      skipped.push({ recordId, reason: "Not an imported subscription" });
    } else if (!isReadyToCancelOnLemonSqueezy(row)) {
      // Cancelling before the customer pays through Paymug would drop them.
      skipped.push({ recordId, reason: "Not live on Paymug yet, or already cancelled" });
    } else {
      try {
        await client.cancelSubscription(row.lsSourceId);
        await markLemonSqueezyCancelled(recordId);
        cancelled.push(recordId);
      } catch (error) {
        failed.push({
          recordId,
          message: error instanceof Error ? error.message.slice(0, 300) : "Cancel failed",
        });
      }
    }
  }
  return Response.json({ cancelled, skipped, failed });
}
