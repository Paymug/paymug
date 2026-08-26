---
title: Troubleshooting
audience: store-owners-and-operators
render: web
last-verified: 2026-08-26
---

# Troubleshooting

## Payment succeeded but order is unpaid

Check the provider mode, webhook URL, signing secret, and callback delivery. Do
not charge the buyer again before checking the first attempt.

## Customer cannot access a purchase

Check the customer email, store URL, order status, test/live mode, and delivery
settings.

## API key does not work

Check the base URL, header, key value, expiry, and account mode. Do not print the
key while debugging.

## Webhook failed

Check HTTPS, response status, timeout, secret, signature verification, and duplicate
handling. Fix the receiver before resending.
