---
title: Checkout
audience: store-owners-and-customers
render: web
last-verified: 2026-08-26
---

# Checkout

The buyer opens a product link, applies a discount if available, pays through the
selected provider, and returns to Paymug.

A browser success page is not proof of payment. The provider callback must confirm
the payment before Paymug marks the order paid and gives access to delivery.

If payment succeeded but delivery is missing, check the order status, provider
mode, webhook setup, customer email, and product delivery settings.
