import type { CheckoutCustomData } from "./checkout-custom-data.types";
import type {
  ExtraSeatProduct,
  ProductExtraSeatTier,
} from "./extra-seats.types";

export const extraSeatsCustomKey = "extra_seats";
export const maxExtraSeats = 1000;
export const maxExtraSeatTiers = 10;
const maxTierPrice = 1_000_000_000;

export function normalizeExtraSeatTiers(value: unknown): ProductExtraSeatTier[] {
  if (!Array.isArray(value)) return [];
  const byStart = new Map<number, number>();
  for (const entry of value) {
    const from = Number((entry as ProductExtraSeatTier)?.from);
    const price = Number((entry as ProductExtraSeatTier)?.price);
    if (
      !Number.isInteger(from) ||
      from < 1 ||
      from > maxExtraSeats ||
      !Number.isInteger(price) ||
      price < 0 ||
      price > maxTierPrice
    ) {
      continue;
    }
    byStart.set(from, price);
  }
  const tiers = [...byStart.entries()]
    .sort(([left], [right]) => left - right)
    .slice(0, maxExtraSeatTiers)
    .map(([from, price]) => ({ from, price }));
  // The first tier always starts at the first extra seat.
  if (tiers.length) tiers[0] = { ...tiers[0], from: 1 };
  return tiers;
}

export function parseExtraSeatTiers(value: string): ProductExtraSeatTier[] {
  try {
    return normalizeExtraSeatTiers(JSON.parse(value));
  } catch {
    return [];
  }
}

export function serializeExtraSeatTiers(value: unknown): string {
  return JSON.stringify(normalizeExtraSeatTiers(value));
}

/** Extra seats only make sense for licensed products with a finite seat count. */
export function canSellExtraSeats(product: ExtraSeatProduct): boolean {
  return (
    product.extraSeatsEnabled &&
    product.generateLicense &&
    product.licenseSeatLimit !== null &&
    product.extraSeatTiers.length > 0
  );
}

export function parseExtraSeatCount(custom: CheckoutCustomData = {}): number {
  const raw = custom[extraSeatsCustomKey];
  if (raw === undefined || !/^\d{1,4}$/.test(raw.trim())) return 0;
  return Math.min(maxExtraSeats, Number(raw));
}

/** Per-seat price (cents) for the given 1-based extra seat. */
export function getExtraSeatUnitPrice(
  tiers: ProductExtraSeatTier[],
  seat: number,
): number {
  let price = tiers[0]?.price ?? 0;
  for (const tier of tiers) {
    if (tier.from <= seat) price = tier.price;
  }
  return price;
}

/** Tiers accumulate: each seat is charged at the rate of the tier it falls in. */
export function calculateExtraSeatsPrice(
  tiers: ProductExtraSeatTier[],
  seats: number,
): number {
  let total = 0;
  for (let index = 0; index < tiers.length; index += 1) {
    const start = tiers[index].from;
    const end = Math.min(
      seats,
      index + 1 < tiers.length ? tiers[index + 1].from - 1 : seats,
    );
    if (end >= start) total += (end - start + 1) * tiers[index].price;
  }
  return total;
}

/** Seat limit a new license gets: base seats plus purchased extra seats. */
export function resolveLicenseSeatLimit(
  product: ExtraSeatProduct,
  custom: CheckoutCustomData = {},
): number | null {
  if (product.licenseSeatLimit === null) return null;
  if (!canSellExtraSeats(product)) return product.licenseSeatLimit;
  return product.licenseSeatLimit + parseExtraSeatCount(custom);
}
