// Entry for Wrangler (`wrangler.jsonc` → main).
// Imports `.open-next/worker.js`, which OpenNext generates after `next build`.
// This file is excluded from tsconfig so Next typechecking does not require that file yet.
import handler from "./.open-next/worker.js";
import { generateBiweeklyAffiliatePayoutReports } from "./src/worker/affiliate-payout-reports";
import { processCheckoutReminders } from "./src/worker/checkout-reminders";
import { processScheduledEmailCampaigns } from "./src/worker/email-campaigns";

export default {
  fetch: handler.fetch,
  scheduled(_event, env, context) {
    context.waitUntil(
      Promise.all([
        generateBiweeklyAffiliatePayoutReports(env.DB).then((result) => {
          console.info("Biweekly affiliate payout reports generated", result);
        }),
        processCheckoutReminders(env).then((result) => {
          console.info("Abandoned checkout reminders processed", result);
        }),
        processScheduledEmailCampaigns(env).then((result) => {
          console.info("Scheduled email campaigns processed", result);
        }),
      ]),
    );
  },
} satisfies ExportedHandler<CloudflareEnv>;

export {
  BucketCachePurge,
  DOQueueHandler,
  DOShardedTagCache,
} from "./.open-next/worker.js";
