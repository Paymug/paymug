---
title: API quickstart
audience: api-integrators
render: web
last-verified: 2026-08-26
---

# API quickstart

## Create a key

Create an API key in Dashboard → Settings → API keys. Copy it once and store it
as a secret.

## Make a request

```bash
curl "$BASE_URL/api/v1/products" \
  -H "Authorization: Bearer $PAYMUG_API_KEY"
```

Use `x-api-key: $PAYMUG_API_KEY` if your client cannot send a Bearer header.

The response contains a `products` array. You can use the same key with
`/api/v1/orders` and `/api/v1/customers`.

Never send a key in a URL. Use HTTPS and keep test/live keys separate.
