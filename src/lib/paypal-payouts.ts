import "server-only";

import { getPayPalCredentials } from "./payment-credentials";
import { getPayPalAccessToken, paypalBaseUrl } from "./paypal";
import type {
  PayPalPayoutInput,
  PayPalPayoutResult,
} from "./paypal-payouts.types";

export async function createPayPalPayout(
  input: PayPalPayoutInput
): Promise<PayPalPayoutResult> {
  const connection = await getPayPalCredentials(
    input.userId,
    input.mode,
    input.storeId
  );
  if (!connection) {
    throw new Error(
      `Add PayPal ${input.mode} credentials before creating payouts`
    );
  }
  const token = await getPayPalAccessToken(
    connection.clientId,
    connection.clientSecret,
    input.mode
  );
  const response = await fetch(
    `${paypalBaseUrl(input.mode)}/v1/payments/payouts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "PayPal-Request-Id": `payout-${input.recordId}`,
      },
      body: JSON.stringify({
        sender_batch_header: {
          sender_batch_id: `paymug-${input.recordId}`,
          email_subject: "You received an affiliate payout",
          email_message: input.note || "Thank you for being an affiliate.",
        },
        items: [
          {
            recipient_type: "EMAIL",
            amount: {
              value: input.amount.toFixed(2),
              currency: "USD",
            },
            receiver: input.recipientEmail,
            note: input.note || "Paymug affiliate commission",
            sender_item_id: input.recordId,
          },
        ],
      }),
    }
  );
  const result = (await response.json()) as {
    batch_header?: {
      payout_batch_id?: string;
      batch_status?: string;
    };
    message?: string;
  };
  if (!response.ok || !result.batch_header?.payout_batch_id) {
    throw new Error(
      result.message ||
        "PayPal rejected the payout. Confirm that Payouts API access is enabled."
    );
  }
  return {
    payoutBatchId: result.batch_header.payout_batch_id,
    payoutStatus: result.batch_header.batch_status || "PENDING",
  };
}
