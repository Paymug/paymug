---
title: Migrate from Lemon Squeezy
audience: store-owners-and-operators
render: web
last-verified: 2026-11-17
---

# Migrate from Lemon Squeezy

Lemon Squeezy stops processing payments, including subscription renewals, on
2027-03-31. Migration is free and not gated behind Paymug Pro.

## Run the import

1. Open **Settings → Migrate**.
2. Paste a Lemon Squeezy API key (**Settings → API** in Lemon Squeezy) and pick
   test or live mode. Test keys import into your sandbox, live keys into live.
   The key is stored encrypted only while the import runs and is deleted when it
   finishes, fails or is cancelled.
3. Pick the Lemon Squeezy store and click **Preview import**. Review counts and
   conflicts, and untick resources you do not want. Products and variants are
   always imported because the rest depends on them.
4. Click **Import**. Keep the page open for fastest progress; progress is saved,
   so reopening the page continues the job.
5. Download the failures CSV and ID mapping from the report.

Re-running is safe: rows are matched on their Lemon Squeezy ID, so nothing is
duplicated. Imports never send emails, notifications or outbound webhooks.

## What is imported

| Lemon Squeezy | Paymug |
| --- | --- |
| Product | Product (slug collisions get a numeric suffix) |
| Variant | Product variant, with price, pay-what-you-want, interval, trial and license settings |
| File | Variant file (downloaded once; files over 25 MB, or expired links, are reported as failures) |
| Customer | Customer, deduplicated by lower-cased email |
| Order | Order with gateway `lemonsqueezy` (historical, read-only) |
| License key and instances | License with the full key, activation limit, expiry and instance IDs |
| Discount | Discount. Product-limited discounts whose scope cannot be resolved import **inactive** for review |
| Affiliate | Affiliate profile (no payout history) |
| Subscription | Subscription with status `migration_pending` |

Variants are native: each one carries its own price, billing interval, trial,
files, license settings and delivery content, and falls back to the product's
values where it sets none. Checkout, fulfillment, licenses and subscriptions use
the buyer's chosen variant. Link straight to one with
`/buy/<product>?variant=<variant id>`.

## Subscriptions

Subscriptions cannot move in one click and do not bill until you move them. The
checklist on the Migrate page shows every imported subscription.

- **Card subscriptions:** Lemon Squeezy's API exposes no processor IDs, so cards
  move through Lemon Squeezy's card-data transfer to your Stripe account (My
  Account, Settings, Migration). Once they arrive, click **Preview linking** (a
  dry run that creates nothing), then **Link subscriptions**. Paymug matches
  Stripe customers by email and creates a Stripe subscription that first bills on
  the customer's original renewal date, so nobody is charged twice. Anything
  ambiguous goes to manual review and is never created: several Stripe customers
  with the same email, a card whose last four digits differ, or a renewal date
  that is missing or already passed. Retrying is safe.
- **PayPal subscriptions** cannot migrate. **Send re-subscribe emails** sends each
  customer a personal link (signed, tied to their email) that starts billing on
  their old renewal date. The checklist shows who has re-subscribed.
- **Cancel on Lemon Squeezy:** once a customer bills through Paymug, a per-row
  **Cancel** button ends the Lemon Squeezy copy. You enter your API key for that
  request only; rows that are not yet live on Paymug cannot be cancelled.

Stripe subscriptions created this way are billed by Stripe. Paymug records them
as active subscriptions with the Stripe subscription ID.

## Go live

- Replace Lemon Squeezy checkout links with Paymug links. Links, APIs and
  webhooks do not redirect.
- Point license validation at the compatibility endpoints in the
  [license activation docs](../api/license-activation.md).
- Switch webhooks to Paymug.
- Paymug is not a merchant of record. You are responsible for collecting and
  remitting tax; see **Settings → Tax**.

## API

`POST /api/settings/migrate/lemonsqueezy/{connect,preview,start,cancel}` and
`GET/POST .../status` accept a dashboard session or an API key with the
`migrations:write` scope. `POST .../status?id=<job>` runs one chunk; call it
until the job status is `completed`. Subscription steps live under
`.../subscriptions` (`GET` list, `POST link`, `POST resubscribe`, `POST cancel`).

MCP clients get `migrate_from_lemonsqueezy`, `advance_migration` and
`get_migration_status` with a `migrations` key. If you close the page, the
scheduled worker resumes stalled jobs (within about five minutes).

## Variants

Open a product, then **Variant overrides** under an option. Turn a section on to
override it for that variant; sections that are off use the product's settings.

