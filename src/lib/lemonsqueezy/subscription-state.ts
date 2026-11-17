export interface MigrationSubscriptionRow {
  id: string;
  email: string;
  product: string;
  variant: string | null;
  status: string;
  migrationState: string;
  processor: string;
  cardLast4: string | null;
  renewsAt: string | null;
  lsSourceId: string;
  stripeSubscriptionId: string | null;
  resubscribedAt: string | null;
  resubscribeEmailedAt: string | null;
  lsCancelledAt: string | null;
}

/** Rows whose customer now pays through Paymug, so the Lemon Squeezy copy can end. */
export function isReadyToCancelOnLemonSqueezy(row: MigrationSubscriptionRow): boolean {
  return (
    !row.lsCancelledAt &&
    (row.migrationState === "linked" || Boolean(row.resubscribedAt))
  );
}
