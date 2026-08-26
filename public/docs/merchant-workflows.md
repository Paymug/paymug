audience: coding-ai-and-support
render: plain
public-root: /

# Merchant workflows

## First sale

Prerequisites: test mode, a payment sandbox, and a published test product.

1. Open the product checkout link.
2. Complete payment in the provider sandbox.
3. Return to the success page.
4. Confirm the dashboard order is paid.
5. Confirm the buyer can access the expected delivery.

If the provider shows success but the order is not paid, check the provider
webhook setup. Do not mark the order paid by hand unless the product instructions
explicitly allow it.

## Subscription

Create a subscription product, set the plan and trial if needed, publish it, and
complete a sandbox subscription. Check approval, active, failed, cancelled, and
expired states using the provider test tools.

## Product delivery

Choose files, license keys, or private GitHub access. Test the customer experience
after payment. Check expiry and revocation rules before testing a second customer.

## Growth features

Discounts, campaigns, automations, subscribers, affiliates, and pages may require
Pro. If a feature is unavailable, check [license activation](/docs/license-activation.md)
before changing other settings.
