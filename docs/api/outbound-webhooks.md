---
title: Outbound webhook API
audience: api-integrators
render: web
last-verified: 2026-08-26
---

# Outbound webhook API

Paymug can send events for orders, subscriptions, and licenses. Configure a
webhook in Dashboard → Settings → Webhooks.

Your receiver must:

- use HTTPS;
- verify the Paymug signature before using the payload;
- save the delivery ID;
- handle duplicate deliveries;
- return a fast success response;
- retry only after fixing the failure.

Current event names include `order_created`, `order_refunded`,
`subscription_created`, `subscription_updated`, `subscription_cancelled`,
`subscription_resumed`, `subscription_expired`,
`subscription_payment_success`, `subscription_payment_failed`,
`license_key_created`, `license_key_updated`, and `webhook_test`.

The exact signature header and payload envelope must be confirmed for the
deployment version before production use.
