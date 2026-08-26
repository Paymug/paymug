audience: coding-ai-and-support
render: plain
public-root: /

# Webhook workflows

## Create a receiver

The receiver should use HTTPS, save the delivery ID, verify the signature before
using the payload, return a quick success response, and process duplicates safely.

## Configure a Paymug outbound webhook

1. Open Settings → Webhooks.
2. Add the HTTPS receiver URL.
3. Select only needed events.
4. Set a random secret and store it securely.
5. Send a test event.
6. Verify the signature and delivery ID at the receiver.
7. Inspect delivery history.

Current event names include `order_created`, `order_refunded`,
`subscription_created`, `subscription_updated`, `subscription_cancelled`,
`subscription_resumed`, `subscription_expired`,
`subscription_payment_success`, `subscription_payment_failed`,
`license_key_created`, `license_key_updated`, and `webhook_test`.

## Handle retries

Assume a delivery can be repeated. Deduplicate by delivery ID and make processing
idempotent. If a delivery fails, inspect the response and resend it after fixing
the receiver. Do not disable signature checks to make a test pass.

## Provider callbacks

PayPal and Stripe callbacks are different from outbound merchant webhooks. Use
the provider's configured mode and signing secret. Never treat a buyer redirect
as a verified provider callback.
