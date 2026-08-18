import type { PayPalMode } from "./types";

export function resolveStorefrontEnvironment(
  _sellerId: string,
  sellerEnvironment: PayPalMode,
  _viewerId?: string,
): PayPalMode {
  return sellerEnvironment;
}
