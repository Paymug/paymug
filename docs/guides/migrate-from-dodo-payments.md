---
title: Migrate from Dodo Payments
audience: store-owners-and-operators
render: web
last-verified: 2026-11-17
---

# Migrate from Dodo Payments

Dodo Payments has the richest API of the three for digital goods: products, files, license keys, discounts and subscriptions can all be imported. Migration is free and not gated behind Paymug Pro.

## Run the import

1. Open **Settings → Migrate** and choose **Dodo Payments**.
2. Create an API key in Dodo (a read-only key is recommended). Test or live is detected from the key prefix (`dodo_test_…` or `dodo_live_…`). The key is stored encrypted only while the import runs and is
   deleted when it finishes, fails or is cancelled.
3. Click **Preview import**, review counts and conflicts, and untick resources
   you do not want. Products and variants are always imported.
4. Click **Import**. Progress is saved, so reopening the page continues the job.
5. Download the failures CSV and the ID mapping from the report.

Re-running is safe: rows are matched on their Dodo Payments ID, so nothing is
duplicated. Imports never send emails, notifications or outbound webhooks.

## What is imported

- Products with one variant each: one-time, subscription, pay-what-you-want, trial days.
- Digital files (fetched one at a time from fresh presigned URLs), license-key entitlements as license settings and GitHub entitlements.
- Customers, succeeded payments as orders (`gateway = dodo`, refunded status carried over), license keys with their instances, discounts and subscriptions as `migration_pending`.

## Not imported

- Usage-based and credit products, meters and wallets.
- Discord, Telegram, Notion, Figma, Framer and feature-flag entitlements (manual follow-up).
- Localized prices and add-ons (the API list does not expose them).

## Subscriptions

Dodo documents no card export, so subscriptions are **re-subscribe only** until Dodo confirms an export to Stripe.

- **Default:** use **Send re-subscribe emails**. Each customer gets a personal checkout link with a trial until their old billing date.
- **If Dodo exports cards to your Stripe:** upload Stripe's mapping file, then use **Preview linking** and **Link subscriptions**.
- Cancel the Dodo subscription per row once the Paymug one is active. This needs Write permission on subscriptions, so add it to your key at that point.

## Go live

- Swap checkout links, overlay checkout and short links.
- Point license validation at `/api/compat/dodo/licenses/validate` (also `activate` and `deactivate`), so apps using the Dodo SDK only change their base URL.
- Paymug is not a merchant of record. You are responsible for collecting and
  remitting tax (see **Settings → Tax**).
