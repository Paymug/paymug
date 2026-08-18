export function formatProductPageMoney(
  cents: number,
  currency = "USD",
): string {
  const hasFraction = Math.abs(cents) % 100 !== 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  }).format(cents / 100);
}
