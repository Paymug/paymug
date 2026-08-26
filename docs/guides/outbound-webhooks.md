---
title: Outbound webhooks
audience: store-owners-and-integrators
render: web
last-verified: 2026-08-26
---

# Outbound webhooks

Webhooks tell your system when an order, subscription, or license changes.

1. Create an HTTPS endpoint.
2. Open Dashboard → Settings → Webhooks.
3. Add the endpoint and select events.
4. Create a secret and store it safely.
5. Send a test event.
6. Verify the signature and save the delivery ID.

Your receiver must handle duplicate deliveries and retries. See the [API webhook
guide](../api/outbound-webhooks.md).
