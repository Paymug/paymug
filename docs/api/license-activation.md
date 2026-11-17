---
title: License activation API
audience: api-integrators
render: web
last-verified: 2026-08-26
---

# License activation API

Use these endpoints to manage a Paymug Pro installation:

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/licenses/activate` | Activate or refresh an installation |
| `POST` | `/api/v1/licenses/validate` | Check an existing activation |
| `POST` | `/api/v1/licenses/deactivate` | Remove an installation activation |

Activation and validation require `licenseKey`, `productId` (the product that
issued the license), `instanceId` (UUID), `instanceUrl`, and `appVersion`. The
`productId` must match the license record's product ID. Successful responses
include the `instanceId`; retain it as the activation ID.

Deactivation requires only `productId` and that returned `instanceId`. Do not
send the license key when deactivating.
The response includes `valid`, `state`, `plan`, `features`, and `manageUrl`.

## Seat availability

Activate and validate responses also report seat usage whenever the license key
is found and belongs to the product:

| Field | Type | Meaning |
| --- | --- | --- |
| `seatLimit` | integer or `null` | Total device seats, including extra seats; `null` is unlimited |
| `seatsUsed` | integer | Devices currently activated |
| `seatsRemaining` | integer or `null` | Free seats; `null` is unlimited |

To check for a free seat without using one, call `validate` from any installation
that is already activated and read `seatsRemaining`. A device that is not yet
activated gets `valid: false` ("License is not activated for this installation")
but the seat fields are still returned. Activation also returns them, including
when it fails with the seat limit error.

A license can have a fixed device seat limit or unlimited seats. Activating a new
device uses one seat. When a fixed limit is full, activation fails with a seat
limit error. Refreshing an existing device does not use another seat.

When the product sells extra seats, the license seat limit is the product seat
limit plus the extra seats bought at checkout (stored on the license as
`extraSeats`).

Customers can buy more seats for an existing license from the customer portal.
The add-on is an ordinary paid order whose custom data contains
`seat_addon_order` (the original order ID) and `extra_seats` (the number of new
seats). Once the order is paid, the license `seatLimit` and `extraSeats` grow by
that count. The order must use the original purchase email, and add-ons are not
available for subscription products.

Customers can open the licensed purchase at `/customer` to view active devices
and remove one. A removed device fails its next validation.

Keep the license key secret. Do not retry an activation conflict in a loop. See
the [AI license runbook](/docs/license-activation.md) for a complete example.

## Lemon Squeezy compatibility

Apps that validate keys against Lemon Squeezy only need a new base URL. These
endpoints accept form-encoded or JSON bodies and return the Lemon Squeezy shape:

| Method | Path | Body |
| --- | --- | --- |
| `POST` | `/api/compat/lemonsqueezy/v1/licenses/validate` | `license_key`, optional `instance_id` |
| `POST` | `/api/compat/lemonsqueezy/v1/licenses/activate` | `license_key`, `instance_name` |
| `POST` | `/api/compat/lemonsqueezy/v1/licenses/deactivate` | `license_key`, `instance_id` |

Keys imported from Lemon Squeezy keep working, including their activation limit,
expiry and existing instance IDs. `activation_limit` is `0` for unlimited. The
endpoints do not require an API key, matching Lemon Squeezy.

## Polar compatibility

Keys imported from Polar keep working, with their activation limit, expiry and
activations. Send the Polar customer-portal requests to Paymug (no API key):

| Method | Path | Body |
|---|---|---|
| `POST` | `/api/compat/polar/v1/customer-portal/license-keys/validate` | `key`, optional `activation_id` |
| `POST` | `/api/compat/polar/v1/customer-portal/license-keys/activate` | `key`, `label` |
| `POST` | `/api/compat/polar/v1/customer-portal/license-keys/deactivate` | `key`, `activation_id` (answers `204`) |

`organization_id`, `conditions` and `meta` are accepted and ignored.

## Dodo Payments compatibility

Keys imported from Dodo keep working. These mirror Dodo's public license API
(no API key):

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/api/compat/dodo/licenses/validate` | `license_key`, optional `license_key_instance_id` | `{ "valid": boolean }` |
| `POST` | `/api/compat/dodo/licenses/activate` | `license_key`, `name` | `201` instance (`403` inactive, `404` unknown, `422` limit reached) |
| `POST` | `/api/compat/dodo/licenses/deactivate` | `license_key`, `license_key_instance_id` | `200` (`403` unknown instance, `404` unknown key) |
