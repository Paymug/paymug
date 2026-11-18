---
title: API quickstart
audience: api-integrators
render: web
last-verified: 2026-08-26
---

# API quickstart

## Create a key

Create an API key in Dashboard → Settings → API keys. Copy it once and store it
as a secret.

## Make a request

```bash
curl "$BASE_URL/api/v1/products" \
  -H "Authorization: Bearer $PAYMUG_API_KEY"
```

Use `x-api-key: $PAYMUG_API_KEY` if your client cannot send a Bearer header.

The response contains a `products` array. You can use the same key with
`/api/v1/orders`, `/api/v1/customers` and `/api/v1/subscriptions`.

## Cancel a subscription

Give the key the `subscriptions` write permission, then list subscriptions to
find the `id`:

```bash
curl "$BASE_URL/api/v1/subscriptions" \
  -H "Authorization: Bearer $PAYMUG_API_KEY"

curl -X POST "$BASE_URL/api/v1/subscriptions/$SUBSCRIPTION_ID/cancel" \
  -H "Authorization: Bearer $PAYMUG_API_KEY"
```

Paymug cancels the subscription at PayPal or Stripe immediately and returns it
with `status: "cancelled"`. Billing stops now and the customer must buy again to
resume, so confirm with the customer first. Repeating the call is safe. `404`
means the id is not in the key's active environment, `409` means the status
cannot be cancelled, and `502` means the provider refused it and nothing
changed.

Never send a key in a URL. Use HTTPS and keep test/live keys separate.
