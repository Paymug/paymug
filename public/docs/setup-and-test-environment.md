audience: coding-ai-and-support
render: plain
public-root: /

# Setup and test environment

## Before you start

You need:

- the Paymug base URL;
- a seller account with dashboard access;
- test-mode payment credentials when testing checkout;
- a test email address;
- a test product or permission to create one.

Never use a live card, live payment secret, or real customer data for a test.

## Safe order

1. Sign in to the seller dashboard.
2. Select test mode.
3. Configure a sandbox PayPal or Stripe connection.
4. Create a small test product.
5. Publish the product and open its test checkout link.
6. Complete a test purchase.
7. Check the order, customer portal, delivery, and any webhook delivery.
8. Remove test data when it is no longer needed.

## Ready check

The environment is ready when the agent can name the base URL and mode, create or
see a test product, make a test checkout, and confirm the order appears as paid.
If any step is unclear, read [payment and checkout testing](/docs/payment-and-checkout-testing.md)
or [troubleshooting](/docs/troubleshooting.md).
