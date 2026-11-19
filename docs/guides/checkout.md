---
title: Checkout
audience: store-owners-and-customers
render: web
last-verified: 2026-11-19
---

# Checkout

The buyer opens a product link, applies a discount if available, pays through the
selected provider, and returns to Paymug.

When a product sells extra seats, the buyer picks the number of extra seats on
the product page. The seats are added to the order total and to the license seat
limit. Checkout links can preselect them with `?[custom][extra_seats]=3`; the
server recalculates the price from the product's current seat tiers.

A browser success page is not proof of payment. The provider callback must confirm
the payment before Paymug marks the order paid and gives access to delivery.

If payment succeeded but delivery is missing, check the order status, provider
mode, webhook setup, customer email, and product delivery settings.

## Sending buyers back to your app

A checkout link can carry data and a return address for your own app:

```
/p/<slug>?email=jane@example.com&[custom][workspace_id]=w1&[return_url]=https://w1.example.com/
```

- `email` prefills the email field. The buyer can still change it.
- `[custom][name]=value` is stored on the order and sent in webhooks as
  `data.custom`.
- `[return_url]=<url>` (same as `[custom][return_url]`) is where the buyer goes
  after a **paid** order. Paymug only honors it when the URL is https (http only
  for localhost in sandbox mode), has no embedded credentials, and its host is
  in **Settings → Redirects → Allowed redirect domains** (`app.example.com` or
  `*.example.com`; the wildcard does not match `example.com` itself). Any other
  value is ignored and the product's redirect URL is used instead.
- After payment the success page counts down about 3 seconds and redirects, with
  Continue and Stay on this page buttons. Turn this off per product with
  **Auto-redirect to the checkout return URL**; the Continue button stays.
- Pending orders never redirect. The page keeps checking until the provider
  confirms payment.
- The product **Redirect URL after purchase** also accepts `[custom][name]`
  placeholders next to `[order_id]`, `[email]` and `[product_id]`. It is only
  shown as a Continue button; it never auto-redirects.

This works for one-time and subscription products on every gateway, because all
of them return to `/checkout/success?orderId=...`.
