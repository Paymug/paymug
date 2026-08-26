audience: coding-ai-and-support
render: plain
public-root: /

# Payment and checkout testing

Use this runbook for a safe test purchase.

1. Confirm the base URL and select test mode.
2. Confirm the connected provider is PayPal sandbox or Stripe test mode.
3. Create a low-value test product with a known delivery method.
4. Publish the product and open its checkout URL.
5. Use the provider's test buyer/payment details.
6. Complete checkout and return to the success page.
7. Check the order is paid in the dashboard.
8. Check customer access and delivery.
9. Check any expected outbound webhook.

Do not treat a browser success page as proof of payment. The provider callback or
webhook must complete the payment state.

## Failure tests

Test cancellation, declined payment, expired checkout, duplicate callback, and
missing delivery only in test mode. Record the order ID and provider mode, not
payment secrets.

If payment succeeds at the provider but Paymug remains unpaid, check webhook URL,
mode, signature secret, and delivery logs. Do not repeat a charge until the first
attempt is understood.
