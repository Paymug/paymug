import assert from "node:assert/strict";
import { test } from "node:test";
import { isReadyToCancelOnLemonSqueezy, type MigrationSubscriptionRow } from "../src/lib/lemonsqueezy/subscription-state";

const row = (over: Partial<MigrationSubscriptionRow> = {}): MigrationSubscriptionRow => ({
  id: "r", email: "a@x.com", product: "Kit", variant: null, status: "migration_pending",
  migrationState: "waiting_for_cards", processor: "stripe", cardLast4: null, renewsAt: null,
  lsSourceId: "9", stripeSubscriptionId: null, resubscribedAt: null, resubscribeEmailedAt: null,
  lsCancelledAt: null, ...over,
});

test("only cancel on Lemon Squeezy once the customer pays through Paymug", () => {
  assert.equal(isReadyToCancelOnLemonSqueezy(row()), false);
  assert.equal(isReadyToCancelOnLemonSqueezy(row({ migrationState: "needs_resubscribe", processor: "paypal" })), false);
  assert.equal(isReadyToCancelOnLemonSqueezy(row({ migrationState: "linked" })), true);
  assert.equal(isReadyToCancelOnLemonSqueezy(row({ migrationState: "needs_resubscribe", resubscribedAt: "2027-01-02" })), true);
  assert.equal(isReadyToCancelOnLemonSqueezy(row({ migrationState: "linked", lsCancelledAt: "2027-01-03" })), false);
});
