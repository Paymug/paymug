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

A license can have a fixed device seat limit or unlimited seats. Activating a new
device uses one seat. When a fixed limit is full, activation fails with a seat
limit error. Refreshing an existing device does not use another seat.

Customers can open the licensed purchase at `/customer` to view active devices
and remove one. A removed device fails its next validation.

Keep the license key secret. Do not retry an activation conflict in a loop. See
the [AI license runbook](/docs/license-activation.md) for a complete example.
