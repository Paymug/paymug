export function parseRange(raw?: string): number {
  if (raw === "7") return 7;
  if (raw === "90") return 90;
  return 30;
}
