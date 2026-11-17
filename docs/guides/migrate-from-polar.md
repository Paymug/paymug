---
title: Migrate from Polar
audience: store-owners-and-operators
render: web
last-verified: 2026-11-17
---

# Migrate from Polar

Polar offers a free migrate-away process: support copies customers and saved cards into your own Stripe account, and the API import brings the catalog over. Migration is free and not gated behind Paymug Pro.

## Run the import

1. Open **Settings → Migrate** and choose **Polar**.
2. Create an organization access token in Polar (read access is enough for the import; `subscriptions:write` is only needed to cancel subscriptions later), pick the sandbox or live toggle, then choose the organization. The key is stored encrypted only while the import runs and is
   deleted when it finishes, fails or is cancelled.
3. Click **Preview import**, review counts and conflicts, and untick resources
   you do not want. Products and variants are always imported.
4. Click **Import**. Progress is saved, so reopening the page continues the job.
5. Download the failures CSV and the ID mapping from the report.

Re-running is safe: rows are matched on their Polar ID, so nothing is
duplicated. Imports never send emails, notifications or outbound webhooks.

## What is imported

- Products, with one Paymug variant per price (fixed, pay-what-you-want, free and seat-based prices; archived products become drafts).
- Recurring interval and trial per variant.
- License-key benefits as variant license settings (activation limit, expiry), GitHub repository benefits, custom benefit text as delivery content.
- Customers (deduped by email), orders (historical, `gateway = polar`), license keys with their activations, discounts and subscriptions (as `migration_pending`).

## Not imported

- Downloadable files: the Polar API does not expose file URLs, so the variant is flagged in the report and you re-upload the files.
- Metered prices, Discord and meter-credit benefits (listed in the report).
- Checkout links (swap them yourself).

## Subscriptions

Subscriptions import as pending and do not bill until moved.

1. Connect Stripe in Paymug (**Settings → Payments**).
2. Email support@polar.sh and ask for a Stripe-to-Stripe transfer to your Stripe account.
3. When the customers appear in Stripe, use **Preview linking**, then **Link subscriptions**. Paymug matches by email (or, if you upload Stripe's mapping file, by exact ID) and anchors the first charge on the old renewal date so nobody is charged twice.
4. Cancel the Polar subscription per row once the Paymug one is active. The cancel ends at period end and needs your token with `subscriptions:write`.

## Go live

- Swap checkout links and embeds.
- Point license validation at `/api/compat/polar/v1/customer-portal/license-keys/validate` (also `activate` and `deactivate`), so apps using the Polar SDK only change their base URL.
- Polar disables new checkouts while offboarding and holds payouts for 120 days after your last transaction.
- Paymug is not a merchant of record. You are responsible for collecting and
  remitting tax (see **Settings → Tax**).
