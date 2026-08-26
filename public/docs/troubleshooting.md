audience: coding-ai-and-support
render: plain
public-root: /

# Troubleshooting

## API key rejected

Check the base URL, header spelling, key value, expiry, and test/live account.
Do not print the key. Try a read-only endpoint only after these checks.

## Pro feature unavailable

Read [license activation](/docs/license-activation.md). Validate the license and
confirm `state: "active"` plus the needed feature in `features`.

## Provider payment succeeded but order is not paid

Check provider mode, webhook URL, signing secret, callback delivery, and order ID.
Do not charge again until the first attempt is resolved.

## Customer cannot see a purchase

Check the customer email, store URL, order payment state, test/live mode, and
customer sign-in flow. Confirm the purchase belongs to this store.

## File or GitHub delivery is missing

Check the order entitlement, product delivery settings, file/repository access,
expiry, and customer account. Do not give a customer a seller credential.

## Webhook failed

Check HTTPS, status response, timeout, secret, signature verification, duplicate
handling, and delivery history. Fix the receiver before resending.

## Escalate

Report the base URL, mode, approximate time, safe resource ID, status code, and
sanitized error. Never include API keys, license keys, payment secrets, OAuth
tokens, or full customer/payment payloads.
