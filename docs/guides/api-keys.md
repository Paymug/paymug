---
title: API keys
audience: store-owners-and-integrators
render: web
last-verified: 2026-08-26
---

# API keys

1. Open Dashboard → Settings → API keys.
2. Create a key with a clear name and select its permissions (read / write / delete per resource). Grant only what the integration needs.
3. Copy it immediately and store it in a secret manager.
4. Use it in the `Authorization: Bearer <key>` or `x-api-key` header.
5. Revoke the key when it is no longer needed.

The raw key may be shown only when it is created. Never put it in a URL, source
file, browser bundle, or issue report. See the [API quickstart](../api/quickstart.md).

## MCP server

AI clients can manage products, categories, orders, customers, discounts,
licenses, subscribers and subscriptions through the MCP server at `POST /api/mcp`
(Streamable HTTP, `Authorization: Bearer <key>`). The tools a client sees
depend on the key's permissions; calls outside them are rejected. Writes act on
the store and environment (sandbox/live) active for the key's owner.

Example client config:

```json
{
  "mcpServers": {
    "paymug": {
      "type": "http",
      "url": "https://YOUR_DOMAIN/api/mcp",
      "headers": { "Authorization": "Bearer YOUR_KEY" }
    }
  }
}
```

The `subscriptions` permission (read / write) unlocks `list_subscriptions` and
`cancel_subscription`, and `GET /api/v1/subscriptions` and
`POST /api/v1/subscriptions/{id}/cancel`. Write means cancel: it stops billing
at PayPal or Stripe immediately and cannot be undone. Subscriptions have no
delete permission.

The `migrations` permission (read / write) unlocks the import tools:
`migrate_from_lemonsqueezy`, `migrate_from_source` (Polar, Paddle, Dodo
Payments), `advance_migration` and `get_migration_status`. See [Migrate from Lemon Squeezy](migrate-from-lemonsqueezy.md).

Keys created before permissions existed keep read access to products, orders
and customers only.
