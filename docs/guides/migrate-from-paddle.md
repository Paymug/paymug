---
title: Migrate from Paddle
audience: store-owners-and-operators
render: web
last-verified: 2026-11-17
---

# Migrate from Paddle

Paddle Billing has a complete API for catalog, customers, transactions and subscriptions. Paddle Classic is not supported; move to Billing first. Migration is free and not gated behind Paymug Pro.

## Run the import

1. Open **Settings → Migrate** and choose **Paddle**.
2. Create an API key in Paddle (read access is enough for the import; write access to subscriptions is only needed to cancel later) and pick sandbox or live. The key is stored encrypted only while the import runs and is
   deleted when it finishes, fails or is cancelled.
3. Click **Preview import**, review counts and conflicts, and untick resources
   you do not want. Products and variants are always imported.
4. Click **Import**. Progress is saved, so reopening the page continues the job.
5. Download the failures CSV and the ID mapping from the report.

Re-running is safe: rows are matched on their Paddle ID, so nothing is
duplicated. Imports never send emails, notifications or outbound webhooks.

## What is imported

- Products and one variant per price (billing cycle, trial; base currency only).
- Customers (deduped by email).
- Completed transactions as historical orders, one order per line item (`gateway = paddle`), and refund adjustments as refunded orders.
- Discounts (percentage or flat, usage limit, expiry, price scope) and subscriptions as `migration_pending`, with the customer's card brand and last four, and the Paddle customer and payment-method IDs for exact linking.

## Not imported

- License keys and file delivery: Paddle has none.
- Country price overrides, recurring-discount limits and business or tax IDs (listed in the report).

## Subscriptions

Paddle can export saved cards to Stripe on request, and exposes the IDs needed to link exactly.

1. Connect Stripe in Paymug.
2. Switch new sales to Paymug checkout first, then ask Paddle support to export cards to your Stripe account (IXOPAY runs at most two exports, bulk and delta, about two weeks).
3. Upload Stripe's import mapping file under **Stripe mapping file**. Each subscription links by Paddle customer and payment-method ID.
4. **Preview linking**, then **Link subscriptions**: Stripe subscriptions start billing on the Paddle `next_billed_at`.
5. Request the delta export for customers who joined during the switch and link them the same way.
6. Cancel the Paddle subscription per row, ending at the next billing period.

## Go live

- Swap Paddle.js and checkout links.
- Update webhooks.
- Paymug is not a merchant of record. You are responsible for collecting and
  remitting tax (see **Settings → Tax**).
