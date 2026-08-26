audience: coding-ai-and-support
render: plain
public-root: /

# Public API reference

Base URL: the Paymug installation URL.  
Content type: `application/json` for JSON requests.  
Authentication: API key in `Authorization: Bearer <key>` or `x-api-key`.

## Supported resource endpoints

| Method | Path | Result |
| --- | --- | --- |
| `GET` | `/api/v1/products` | Products for the API-key owner |
| `GET` | `/api/v1/orders` | Orders for the API-key owner |
| `GET` | `/api/v1/customers` | Customers for the API-key owner |
| `POST` | `/api/v1/licenses/activate` | Activate a Pro installation |
| `POST` | `/api/v1/licenses/validate` | Validate a Pro installation |
| `POST` | `/api/v1/licenses/deactivate` | Deactivate a Pro installation |

The resource list responses are JSON objects with a plural top-level field such
as `products`, `orders`, or `customers`. Treat item fields as contract data only
when the current API reference documents them.

## Authentication example

```bash
curl "$BASE_URL/api/v1/products" \
  -H "Authorization: Bearer $PAYMUG_API_KEY"
```

`401` means the key is missing, invalid, or expired. Do not create a second key
until you have checked the header, base URL, and key value.

For full workflows, read [API workflows](/docs/api-workflows.md). For license
request fields, read [License activation](/docs/license-activation.md).
