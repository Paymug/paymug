---
title: API keys
audience: store-owners-and-integrators
render: web
last-verified: 2026-08-26
---

# API keys

1. Open Dashboard → Settings → API keys.
2. Create a key with a clear name.
3. Copy it immediately and store it in a secret manager.
4. Use it in the `Authorization: Bearer <key>` or `x-api-key` header.
5. Revoke the key when it is no longer needed.

The raw key may be shown only when it is created. Never put it in a URL, source
file, browser bundle, or issue report. See the [API quickstart](../api/quickstart.md).
