---
title: Product licenses
audience: store-owners-and-customers
render: web
last-verified: 2026-08-26
---

# Product licenses

Some products issue a license key after a successful purchase. The customer can
find the key in the customer portal or purchase email when enabled.

License status may depend on activation, expiry, and product settings. A seller
can manage license records in the dashboard. A customer should contact the seller
when a key is missing or cannot be activated.

When creating a licensed product, choose a fixed device seat limit or unlimited
devices. Each active device uses one seat.

With a fixed seat limit, turn on **Sell extra seats** under the license settings
to let buyers add seats at checkout:

1. Enter the price for each extra seat. Extra seat costs accumulate into the
   order total.
2. Select **+ Add tier** to change the per-seat price from a given seat onward.
   For example, seats 1–10 cost $5 each and seats from 11 cost $3 each. Each
   seat is charged at the rate of the tier it falls in.
3. On the product page, buyers use the plus and minus controls to choose how
   many extra seats to buy.

The license is issued with the product seat limit plus the purchased extra
seats. Extra seats are not available with unlimited device seats.

Customers can manage devices from `/customer`:

1. Open the purchase details.
2. Find Active devices below the license key.
3. Remove a device that is no longer used.

After removal, that device fails its next license validation. It may be activated
again later if a seat is available.

For Paymug Pro installation activation, use the [API license guide](../api/license-activation.md)
or the [AI license runbook](/docs/license-activation.md).
