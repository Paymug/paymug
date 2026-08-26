---
title: Payment setup
audience: store-owners-and-operators
render: web
last-verified: 2026-08-26
---

# Payment setup

Paymug lets you connect PayPal or Stripe. The payment provider receives the
payment. Paymug records the order and manages delivery.

## Safe setup

1. Use test mode first.
2. Create sandbox/test credentials with PayPal or Stripe.
3. Add the credentials to the Paymug deployment.
4. Choose the provider in Dashboard → Payments.
5. Configure and verify provider webhooks.
6. Complete a test checkout.
7. Switch to live mode only after the test order and delivery work.

Keep test and live credentials separate. Never put payment secrets in a product,
browser code, API request, or support message.
