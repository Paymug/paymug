/** Statuses a subscription can be cancelled from. */
const cancellableStatuses = new Set([
  "active",
  "trialing",
  "past_due",
  "suspended",
  "paused",
]);

/** Statuses that are already over; cancelling them is a no-op. */
const terminalStatuses = new Set([
  "cancelled",
  "approval_cancelled",
  "expired",
  "superseded",
]);

export function isCancellableSubscriptionStatus(status: string): boolean {
  return cancellableStatuses.has(status.toLowerCase());
}

export function isTerminalSubscriptionStatus(status: string): boolean {
  return terminalStatuses.has(status.toLowerCase());
}
