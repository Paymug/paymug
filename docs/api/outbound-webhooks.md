---
title: Outbound webhook API
audience: api-integrators
render: web
last-verified: 2026-11-19
---

# Outbound webhook API

Paymug can send events for orders, subscriptions, and licenses. Configure a
webhook in Dashboard → Settings → Webhooks. Webhooks are scoped to a store and
an environment (live or sandbox), and can be limited to chosen products and
events (an empty list means all).

Verified against `src/lib/outbound-webhooks.ts`,
`src/lib/outbound-webhook-payload.utils.ts` and
`src/lib/outbound-webhook-commerce.utils.ts`.

## Request

Paymug sends `POST <your URL>` with a JSON body and these headers:

| Header | Value |
| --- | --- |
| `Content-Type` | `application/json` |
| `User-Agent` | `Paymug-Webhooks/1.0` |
| `X-Event-Name` | The event name, for example `order_created` |
| `Authorization` | Only when you set an auth value on the webhook. Sent exactly as you entered it (for example `Bearer abc123`). |

The request times out after 10 seconds. Any 2xx response counts as success;
anything else is recorded as failed in the delivery log. **Paymug does not
retry automatically.** You can resend a delivery from the dashboard.

## Authenticity: there is no HMAC signature

Paymug does **not** sign webhook bodies. There is no signature header and no
signing algorithm. The only credential is the static `Authorization` value you
configure on the webhook. To authenticate deliveries:

1. Set a long random secret as the webhook's auth value, for example
   `Bearer <random>`.
2. Reject any request whose `Authorization` header does not match, using a
   constant-time comparison.
3. Use HTTPS only, so the header cannot be read in transit.

## Envelope

```json
{
  "meta": {
    "event_name": "order_created",
    "test_mode": false,
    "webhook_id": "<webhook id>"
  },
  "data": { }
}
```

- `meta.event_name`: same as the `X-Event-Name` header.
- `meta.test_mode`: `true` for sandbox webhooks.
- `meta.webhook_id`: the id of the webhook that fired.
- There is no delivery-id field in the body or headers. De-duplicate on
  `meta.event_name` + `data.id` (+ `data.status` for subscriptions).

## Events

`order_created`, `order_refunded`, `subscription_created`,
`subscription_updated`, `subscription_cancelled`, `subscription_resumed`,
`subscription_expired`, `subscription_payment_success`,
`subscription_payment_failed`, `license_key_created`, `license_key_updated`,
and `webhook_test` (sent by the Send test button, `data` has `id`, `message`,
`created_at`).

## Order events `data`

`order_created`, `order_refunded`, `subscription_payment_success` and
`subscription_payment_failed` carry the order. Money fields are in major units
(`amount: 19.99`) with a matching `...Cents` integer (`amountCents: 1999`).

| Field | Notes |
| --- | --- |
| `id` | Order id |
| `productId`, `productName`, `storeId`, `userId` | |
| `status` | `pending`, `paid`, `failed`, `refunded` |
| `customerEmail`, `customerName` | |
| `amount`/`amountCents`, `currency` | Amount charged |
| `discountAmount`/`discountAmountCents`, `transactionFeeAmount`/`transactionFeeAmountCents` | |
| `custom` | **Custom checkout data**, an object of strings from `?[custom][key]=value`. Includes `return_url` when the link set `?[return_url]=`. |
| `gateway` | `paypal`, `stripe` or `sepay` |
| `environment` | `live` or `sandbox` |
| `paypalOrderId`, `stripeCheckoutSessionId`, `stripePaymentIntentId` | Gateway references |
| `createdAt`, `paidAt` | ISO 8601 |

The payload is the stored order, so it can contain more fields than listed
here; rely only on the ones above.

## Subscription and license events `data`

`subscription_*` (except the two payment events above) and `license_key_*`
carry a feature record:

| Field | Notes |
| --- | --- |
| `id` | **Subscription id** (or license id). Stable across all events for that subscription. |
| `feature` | `subscriptions` or `licenses` |
| `title` | Product name |
| `subtitle` | Customer email |
| `status` | Subscription, for example `approval_pending`, `active`, `paused`, `suspended`, `cancelled`, `expired` |
| `custom` | Custom checkout data, as for orders |
| `amount`/`amountCents`, `currency` | Recurring amount |
| `environment`, `createdAt`, `updatedAt` | |
| `data` | Raw record: `storeId`, `productId`, `orderId` (the checkout order), `intervalUnit`, `intervalCount`, `trialDays`, `customerName`, `custom`, gateway ids such as `paypalSubscriptionId`, ... |

To link a subscription event to the checkout that created it, use
`data.data.orderId`, or match on `custom` values you set in the checkout link
(for example `custom.workspace_id`).

## Receiver checklist

- use HTTPS;
- check the `Authorization` value before using the payload;
- de-duplicate deliveries (see Envelope);
- return a 2xx quickly and do slow work afterwards;
- do not rely on the browser success page as proof of payment; use the
  webhook or the API.
