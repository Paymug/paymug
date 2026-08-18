import "server-only";

import { getPayPalCredentials, getStripeCredentials } from "./payment-credentials";
import type { PayPalMode } from "./types";
import type { PayPalEnvironmentState } from "./paypal-environment.types";
import { getStoreById } from "./stores";

export async function getPayPalEnvironmentState(
  userId: string,
  active: PayPalMode,
  storeId?: string
): Promise<PayPalEnvironmentState> {
  const [store, paypalSandbox, paypalLive, stripeSandbox, stripeLive] = await Promise.all([
    storeId ? getStoreById(storeId, userId) : undefined,
    getPayPalCredentials(userId, "sandbox", storeId),
    getPayPalCredentials(userId, "live", storeId),
    getStripeCredentials(userId, "sandbox", storeId),
    getStripeCredentials(userId, "live", storeId),
  ]);

  return {
    active,
    availability: {
      sandbox:
        store?.paymentGateway === "stripe"
          ? Boolean(stripeSandbox)
          : Boolean(paypalSandbox),
      live:
        store?.paymentGateway === "stripe"
          ? Boolean(stripeLive)
          : Boolean(paypalLive),
    },
  };
}
