import "server-only";

import { LemonSqueezyClient } from "../lemonsqueezy/client";
import { DodoClient } from "./dodo/client";
import { PaddleClient } from "./paddle/client";
import { PolarClient } from "./polar/client";
import type { MigrationSourceId } from "./sources";

/**
 * Ends a subscription at the source, at the end of the paid period where the
 * source supports it. Uses the key sent with the request; nothing is stored.
 */
export async function cancelSourceSubscription(
  source: MigrationSourceId,
  secret: string,
  sourceId: string,
  mode: "test" | "live",
): Promise<void> {
  switch (source) {
    case "lemonsqueezy":
      return new LemonSqueezyClient({ apiKey: secret }).cancelSubscription(sourceId);
    case "polar":
      return new PolarClient({ token: secret, mode }).cancelSubscription(sourceId);
    case "paddle":
      return new PaddleClient({ apiKey: secret, mode }).cancelSubscription(sourceId);
    case "dodo":
      return new DodoClient({ apiKey: secret, mode }).cancelSubscription(sourceId);
  }
}
