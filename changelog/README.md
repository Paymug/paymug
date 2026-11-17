# Changelog

User-facing changes to Paymug, grouped by month (newest first).

| Month | Highlights |
|-------|------------|
| [2026-11](2026-11.md) | Stripe Tax, MCP server + scoped API keys, SEPay gateway, dashboard query/icon improvements |
| [2026-10](2026-10.md) | Extra seats (merchant + customer add-on), user time zones, email checks, order confirmation resend |

Each entry notes whether it ships a database migration. Migrations live in
[`drizzle/`](../drizzle) and are applied by `npm run deploy` or
`npm run db:migrate:local`.
