audience: coding-ai-and-support
render: plain
public-root: /

# API workflows

## Create and test an API key

1. Sign in to the seller dashboard.
2. Open Settings → API keys.
3. Create a key with a clear name and expiry if needed.
4. Save the returned secret in a secret manager. It may not be shown again.
5. Call a read-only endpoint:

```bash
curl "$BASE_URL/api/v1/products" \
  -H "x-api-key: $PAYMUG_API_KEY"
```

6. Confirm `200` and a `products` array.

## Read orders and customers

Use the same key with `/api/v1/orders` and `/api/v1/customers`. The key owner
limits what the agent can read. Keep test and live data separate.

## Rotate a key

Create and test a replacement key first. Update the integration secret. Revoke
the old key only after the replacement works. Do not paste either key into logs.

## Safe error handling

- `400`: fix the request before retrying.
- `401`: check the base URL and key header/value.
- `403`: check account ownership or permissions.
- `404`: check the path and resource identifier.
- `409`: read the state conflict; do not retry in a loop.
- `5xx`: save a request ID if available and retry only a read-only request.

If a response shape is not documented, preserve it and mark `TODO: confirm`.
