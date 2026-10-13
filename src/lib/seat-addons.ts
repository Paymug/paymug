import "server-only";

import { findOrderById } from "./db";
import { getOrderLicense } from "./commerce-features";
import { resolveProductConfiguration } from "./product-configurations";
import {
  canSellExtraSeats,
  maxExtraSeats,
  seatAddOnCustomKey,
} from "./extra-seats";
import type { CheckoutCustomData } from "./checkout-custom-data.types";
import type {
  ResolvedProductConfiguration,
  SeatAddOnContext,
} from "./product-configurations.types";
import type { Product } from "./types";

export interface SeatAddOn extends SeatAddOnContext {
  customerEmail: string;
}

export class SeatAddOnError extends Error {}

/**
 * Validates a seat add-on request (custom `seat_addon_order`) against the
 * original order and its license. Returns undefined for normal checkouts.
 */
export async function loadSeatAddOn(
  product: Product,
  custom: CheckoutCustomData = {},
): Promise<SeatAddOn | undefined> {
  const orderId = custom[seatAddOnCustomKey];
  if (!orderId) return undefined;
  if (product.billingType === "subscription" || !canSellExtraSeats(product)) {
    throw new SeatAddOnError("Extra seats are not available for this product");
  }
  const order = await findOrderById(orderId);
  if (
    !order ||
    order.status !== "paid" ||
    order.productId !== product.id ||
    order.environment !== product.environment ||
    order.custom[seatAddOnCustomKey]
  ) {
    throw new SeatAddOnError("The original purchase could not be found");
  }
  const license = await getOrderLicense(order.userId, order.id);
  if (!license || license.status !== "active") {
    throw new SeatAddOnError("This license is not active");
  }
  const existingExtraSeats = Math.max(0, Number(license.data.extraSeats) || 0);
  if (existingExtraSeats >= maxExtraSeats) {
    throw new SeatAddOnError("This license cannot have more extra seats");
  }
  return {
    orderId: order.id,
    customerEmail: order.customerEmail,
    existingExtraSeats,
  };
}

/** Resolves the checkout configuration, including seat add-on orders. */
export async function resolveCheckoutConfiguration(
  product: Product,
  custom: CheckoutCustomData | undefined,
  basePrice: number,
): Promise<{
  configuration: ResolvedProductConfiguration;
  seatAddOn?: SeatAddOn;
}> {
  const seatAddOn = await loadSeatAddOn(product, custom);
  return {
    configuration: resolveProductConfiguration(
      product,
      custom,
      basePrice,
      seatAddOn,
    ),
    seatAddOn,
  };
}

/** Add-on orders must add at least one seat and use the license owner's email. */
export function assertSeatAddOnOrder(
  seatAddOn: SeatAddOn | undefined,
  configuration: ResolvedProductConfiguration,
  customerEmail: string,
): void {
  if (!seatAddOn) return;
  if (configuration.extraSeats < 1) {
    throw new SeatAddOnError("Choose at least one extra seat");
  }
  if (customerEmail.trim().toLowerCase() !== seatAddOn.customerEmail.toLowerCase()) {
    throw new SeatAddOnError(
      "Extra seats must be purchased with the email of the original purchase",
    );
  }
}
