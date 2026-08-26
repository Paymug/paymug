audience: coding-ai-and-support
render: plain
public-root: /

# Paymug AI agent guide

You are reading the public AI guide for Paymug. This file is published at
`https://domain.com/AGENTS.md`. The related AI guides are published under
`https://domain.com/docs/`.

## Read next

- [Product overview](/docs/product-overview.md)
- [Setup and test environment](/docs/setup-and-test-environment.md)
- [Feature recipes](/docs/feature-recipes.md)
- [License activation](/docs/license-activation.md)
- [API reference](/docs/api-reference.md)
- [API workflows](/docs/api-workflows.md)
- [Payment and checkout testing](/docs/payment-and-checkout-testing.md)
- [Webhook workflows](/docs/webhook-workflows.md)
- [Troubleshooting](/docs/troubleshooting.md)
- [Terminology](/docs/terminology.md)

## Rules

1. Ask for the Paymug base URL before making an API call if it is not known.
2. Use test mode before live mode for payment, delivery, and webhook work.
3. Never print, paste, or store a real API key, license key, payment secret,
   OAuth token, or webhook secret.
4. Use the exact field names and paths in the API guide.
5. Check the response after every state-changing action.
6. Do not retry a payment or license action until the guide says it is safe.
7. If a value or behavior is not documented, say `TODO: confirm` and ask for
   the missing information.
8. When a task succeeds, report the result, the environment used, and any test
   data that should be removed.
