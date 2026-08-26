audience: coding-ai-and-support
render: plain
public-root: /

# Feature recipes

Use these short recipes as a starting point. Read the linked guide before making
an irreversible or live action.

## Create an API key

1. Open Dashboard → Settings → API keys.
2. Create a key with a clear name and optional expiry.
3. Copy it immediately and store it in a secret manager.
4. Call `GET /api/v1/products` to confirm it works.
5. Never put the key in a URL, source file, browser bundle, or chat message.

See [API workflows](/docs/api-workflows.md).

## Create and test a product

1. Select test mode.
2. Create a product with a price and delivery method.
3. Add a test file or license/GitHub delivery only when configured.
4. Publish it.
5. Complete a test checkout and confirm delivery.

## Activate Pro

Use [license activation](/docs/license-activation.md). Confirm the response state is
`active` and that the expected feature is listed before using a Pro feature.

## Configure an outbound webhook

1. Create an HTTPS receiver that can save the delivery ID.
2. Add it in Dashboard → Settings → Webhooks.
3. Select only the events needed by the integration.
4. Set a secret and store it safely.
5. Send a test event.
6. Verify the signature and deduplicate by delivery ID.

See [webhook workflows](/docs/webhook-workflows.md).
