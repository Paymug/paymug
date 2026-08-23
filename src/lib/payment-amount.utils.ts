export function parsePaymentAmountCents(
  value: string | number | null | undefined,
): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return undefined;
  return Math.round(amount * 100);
}
