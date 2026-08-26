audience: coding-ai-and-support
render: plain
public-root: /

# Activate a Pro license

This runbook is for a coding agent that needs to enable Paymug Pro features on an
installation.

## Required values

- `BASE_URL`: the Paymug installation URL;
- `LICENSE_KEY`: the license key, kept secret;
- `PRODUCT_ID`: the UUID of the product that issued the license;
- `INSTANCE_ID`: a stable UUID for this installation;
- `INSTANCE_URL`: the installation URL;
- `APP_VERSION`: the installed Paymug version.

Use fake values in examples:

```text
BASE_URL=https://paymug.example.test
LICENSE_KEY=example-license-key
PRODUCT_ID=00000000-0000-4000-8000-000000000001
INSTANCE_ID=00000000-0000-4000-8000-000000000000
INSTANCE_URL=https://paymug.example.test
APP_VERSION=0.1.0
```

## Activate

```bash
curl -X POST "$BASE_URL/api/v1/licenses/activate" \
  -H "Content-Type: application/json" \
  -d '{
    "licenseKey": "example-license-key",
    "productId": "00000000-0000-4000-8000-000000000001",
    "instanceId": "00000000-0000-4000-8000-000000000000",
    "instanceUrl": "https://paymug.example.test",
    "appVersion": "0.1.0"
  }'
```

The request needs a license key, matching product UUID, UUID instance ID, valid
instance URL, and app version. A successful response has `valid: true`, state
`"active"`, a Pro plan, and a feature list.

Each license has a device seat policy. A product can allow a fixed number of
active devices or unlimited devices. A new device can activate while a seat is
available. When all limited seats are used, activation returns
`License seat limit reached`.

## Validate

Send the same body to:

```text
POST /api/v1/licenses/validate
```

Use validation when the agent needs to confirm an existing activation. Do not
activate repeatedly just to check state.

## Deactivate

Send the same body to:

```text
POST /api/v1/licenses/deactivate
```

Deactivate a test installation before moving a license to another installation.
Confirm the returned state is `deactivated`.

## States and actions

| State | Meaning | Agent action |
| --- | --- | --- |
| `active` | License is valid and enabled | Use the listed features |
| `invalid` | Key, product, mode, or activation is not valid | Check the key and installation values |
| `expired` | License expiry has passed | Ask the owner to renew |
| `deactivated` | This installation is no longer active | Activate again only when intended |

If the seat limit is reached, do not retry in a loop. Ask the customer to open
the purchase in `/customer`, review Active devices, and remove a device that is
no longer used.

## Remove an active device

1. Sign in at `/customer` with the purchase email.
2. Open the purchase that contains the license key.
3. Find Active devices under the license key.
4. Remove the old device.
5. Confirm the device is no longer listed.

The removed device fails its next validation. It can activate again only when a
seat is available and activation is intended.

## Verify

1. Confirm `valid` is `true`.
2. Confirm `state` is `active`.
3. Confirm the required feature is in `features`.
4. Use the feature in test mode.
5. Never print the full license key in the result.
