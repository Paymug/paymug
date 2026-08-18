export const MAX_SUBSCRIPTION_TRIAL_DAYS = 365;

export function parseSubscriptionTrialDays(value: unknown): number {
  if (value === undefined || value === null || value === "") return 0;
  const days = Number(value);
  if (
    !Number.isInteger(days) ||
    days < 0 ||
    days > MAX_SUBSCRIPTION_TRIAL_DAYS
  ) {
    throw new Error(
      `Free trial must be a whole number from 0 to ${MAX_SUBSCRIPTION_TRIAL_DAYS} days`
    );
  }
  return days;
}

export function getSubscriptionTrialEndDate(
  startedAt: string,
  trialDays: number
): string | undefined {
  if (trialDays <= 0) return undefined;
  const endDate = new Date(startedAt);
  if (Number.isNaN(endDate.getTime())) return undefined;
  endDate.setUTCDate(endDate.getUTCDate() + trialDays);
  return endDate.toISOString();
}
