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

Send JSON with `licenseKey`, `instanceId` (UUID), `instanceUrl`, and `appVersion`.
The response includes `valid`, `state`, `plan`, `features`, and `manageUrl`.

Keep the license key secret. Do not retry an activation conflict in a loop. See
the [AI license runbook](/docs/license-activation.md) for a complete example.
