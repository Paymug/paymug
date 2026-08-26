# Product Usage and API Documentation Plan

Status: planned  
Primary audiences: store owners, operators, customers, API integrators, support
teams, and coding AI agents  
Scope: using Paymug and integrating with its supported APIs

## 1. Purpose

This is the master plan for Paymug's user and API documentation. The finished
documentation must teach people how to use the product, configure its features,
complete common workflows, integrate with its APIs, receive webhooks, and solve
operational problems.

This plan is not for documenting the source code, repository layout, internal
architecture, database schema, coding conventions, or contributor workflows.
Those topics are outside this documentation set.

The documentation must help readers answer:

- How do I install or access Paymug and create my first store?
- How do I configure test and live payment environments?
- How do I create, publish, sell, and deliver a product?
- How do subscriptions, licenses, files, and private GitHub delivery work?
- How do I manage orders, customers, campaigns, affiliates, and settings?
- How do I create an API key and call the supported public API?
- How do I validate requests, handle errors, and consume webhooks safely?
- How do I troubleshoot a failed user workflow or integration?

## 2. Audiences

### Store owners and operators

Need task-based guides for setup, payments, products, customers, orders,
subscriptions, marketing, delivery, store settings, and troubleshooting.

### Customers

Need concise help for signing in, accessing purchases, downloading files,
managing passwords/preferences, and using affiliate or license features.

### API developers and integrators

Need stable contracts for authentication, requests, responses, errors, examples,
webhooks, versioning, security, and integration workflows.

### Coding AI agents, support teams, and AI assistants

Need plain, structured operational knowledge for configuring and exercising
Paymug features while building or testing an integration. A coding agent must be
able to complete tasks such as activating a Pro license, creating an API key,
calling a supported endpoint, testing checkout, configuring a webhook, and
diagnosing a failed workflow without needing repository architecture context.

## 3. Documentation boundaries

Include:

- product onboarding and everyday usage;
- self-hosted setup and operational configuration where required to use features;
- merchant dashboard workflows;
- customer portal workflows;
- payment, delivery, marketing, and affiliate workflows;
- public API and supported integration contracts;
- inbound provider setup and outbound webhook consumption;
- examples, troubleshooting, limitations, and FAQs.

Exclude:

- repository and directory maps;
- framework or component architecture;
- database tables, migrations, and internal data models;
- coding standards and code-change playbooks;
- internal route handlers that are not supported integration contracts;
- implementation details that users do not need to operate the product or API.

Internal behavior may be mentioned only when it materially affects a documented
user-visible contract, such as an API limit, retry rule, security requirement, or
data-retention behavior.

## 4. Documentation principles

1. Write task-first documentation. Lead with what the reader will accomplish.
2. Use product language visible in Paymug's interface.
3. Separate store-owner, customer, operator, and API-developer instructions.
4. Never invent fields, permissions, status codes, limits, defaults, or retry
   behavior. Mark unknown behavior as `TODO: confirm`.
5. Show test-mode examples before live-mode examples whenever money or external
   delivery is involved.
6. Use fake credentials, identifiers, emails, URLs, payment information, and
   webhook signatures in every example.
7. Explain prerequisites and expected results for every workflow.
8. Add screenshots only when the interface location is otherwise ambiguous.
9. Keep API contracts explicit and machine-readable through OpenAPI where
   appropriate.
10. Record the product version or release against which each rendered guide was
    verified.

## 5. Target documentation structure

Web-facing Markdown uses front matter with `render: web`. AI/support context uses
plain Markdown with `render: plain` and is not part of the public navigation.

```text
docs/
├── DOCS.md
├── README.md
├── guides/
│   ├── README.md
│   ├── getting-started.md
│   ├── installation-and-deployment.md
│   ├── account-and-store-setup.md
│   ├── test-and-live-modes.md
│   ├── payment-setup.md
│   ├── products.md
│   ├── storefront-and-pages.md
│   ├── checkout.md
│   ├── orders-and-refunds.md
│   ├── customers-and-customer-portal.md
│   ├── subscriptions.md
│   ├── product-files-and-delivery.md
│   ├── licenses.md
│   ├── github-delivery.md
│   ├── discounts.md
│   ├── email-campaigns-and-subscribers.md
│   ├── automations.md
│   ├── affiliates-and-payouts.md
│   ├── analytics-and-notifications.md
│   ├── api-keys.md
│   ├── outbound-webhooks.md
│   ├── backup-restore-and-updates.md
│   ├── settings.md
│   ├── troubleshooting.md
│   └── faq.md
├── customer/
│   ├── README.md
│   ├── signing-in.md
│   ├── accessing-purchases.md
│   ├── downloads-and-github-access.md
│   ├── account-and-email-preferences.md
│   ├── licenses.md
│   └── affiliate-portal.md
├── api/
│   ├── README.md
│   ├── quickstart.md
│   ├── authentication.md
│   ├── conventions.md
│   ├── errors.md
│   ├── pagination-and-filtering.md
│   ├── environments.md
│   ├── products.md
│   ├── orders.md
│   ├── customers.md
│   ├── license-activation.md
│   ├── outbound-webhooks.md
│   ├── webhook-verification.md
│   ├── integration-examples.md
│   ├── changelog.md
│   └── openapi.yaml
└── ai/
    └── README.md
public/
├── AGENTS.md
└── docs/
    ├── product-overview.md
    ├── setup-and-test-environment.md
    ├── feature-recipes.md
    ├── merchant-workflows.md
    ├── customer-workflows.md
    ├── license-activation.md
    ├── api-reference.md
    ├── api-workflows.md
    ├── payment-and-checkout-testing.md
    ├── webhook-workflows.md
    ├── troubleshooting.md
    └── terminology.md
```

The existing `docs/developer/` content should be reviewed and moved or rewritten
into `docs/guides/` only when it explains how to use, configure, or integrate
with Paymug. Codebase-oriented pages are not part of this plan.

### AI public-root rule

The AI files live in the site's `public/` directory. Keep only the documentation
index in `docs/ai/README.md`. Therefore:

- `public/AGENTS.md` is published as `https://domain.com/AGENTS.md`;
- `public/docs/*.md` is published as `https://domain.com/docs/*.md`;
- `public/AGENTS.md` must link to companion files with paths such as
  `/docs/license-activation.md`;
- companion AI files must use `/docs/...` for links to other companion files;
- public AI files must not link to `docs/ai/...`, repository paths, or local
  filesystem paths;
- the public AI root must work without access to the source repository;
- `docs/ai/README.md` is an author-facing index and points to the public URLs.

## 6. Merchant and operator guide specification

### Getting started

Explain prerequisites, installation or hosted access, first sign-in, initial
store creation, test-mode setup, first product, first checkout, and the expected
result after a successful test purchase.

### Installation and deployment

Explain only what an operator needs to deploy and use Paymug: required services,
configuration values, secrets, database/storage/email bindings, deployment steps,
first-run setup, updates, backups, and rollback considerations. Avoid framework
or repository internals.

### Account and store setup

Cover account creation, profile, store identity, slug, branding, email addresses,
store status, multiple stores, primary/active store behavior, and common setup
mistakes.

### Test and live modes

Explain what each mode is, how to switch, which data is separated, how payment
credentials differ, how to perform a safe test purchase, and what must be checked
before accepting live payments.

### Payment setup

Provide separate PayPal and Stripe walkthroughs. Include credential prerequisites,
sandbox/live setup, provider selection, webhook/callback setup, verification,
common provider errors, and a final test transaction checklist.

### Products

Cover one-time and subscription products, pricing, publication status, cover and
description, files, delivery content, custom amounts, redirect behavior, licenses,
private GitHub access, duplication, editing, and sharing a purchase link.

### Storefront and pages

Explain storefront URL/branding, public product pages, custom pages, navigation,
publishing, SEO/social previews, and what visitors see when a store or product is
inactive.

### Checkout

Explain the buyer journey, discounts, custom checkout data, payment provider
handoff, approved/cancelled/success pages, receipts, and what to do when payment
succeeds but delivery is not visible.

### Orders and refunds

Cover order search/view, payment status, customer and product details, refunds or
reversals, public order links, delivery access, and related notifications or
webhook events.

### Customers and customer portal

Explain customer records, portal sign-in, purchases, passwords, email preferences,
GitHub delivery, customer affiliate access, blocking/access behavior, and customer
support workflows.

### Subscriptions

Cover plan setup, trials, approval, recurring payment status, cancellation,
resumption, expiry, failed payments, and the effect of subscription changes on
customer access.

### Delivery, licenses, and GitHub

Create separate guides for file upload/download, delivery content, product license
keys, activation limits, expiry/update access, and private GitHub repository grants.
State prerequisites and recovery steps for every delivery method.

### Marketing and growth

Document discounts, subscribers, campaigns, email preferences, tracking,
automations, affiliate applications, referral links, commission attribution,
payouts, and scheduled payout reports. Clearly label any Pro-only features.

### API keys and outbound webhooks

Explain how store owners create/revoke keys, store a newly displayed key, choose
a webhook URL and events, set a secret, send a test event, inspect delivery
history, and resend a failed delivery. Link to the API reference for contracts.

### Backup, restore, updates, and settings

Explain data export/import, what a backup contains, limitations, safe restore
practice, application update checks, profile/store/growth/automation settings,
and operational recovery.

### Troubleshooting and FAQ

Organize troubleshooting by visible symptom and include prerequisites, diagnostic
questions, safe remediation, expected result, and when to contact a payment,
email, GitHub, or hosting provider.

## 7. Customer help specification

Customer pages must be shorter than merchant guides and avoid administrator or
deployment terminology.

Document:

- requesting and verifying a sign-in link;
- signing in with a password where enabled;
- viewing purchases and order details;
- downloading purchased files;
- accepting or recovering private GitHub repository access;
- finding and using a product license key;
- updating name, password, and email preferences;
- unsubscribing from campaigns;
- using the affiliate portal, referral links, and payout views;
- contacting the store owner when access or payment records are missing.

Every guide must explain which store owns the purchase and must not imply that
Paymug is the merchant of record or payment recipient.

## 8. API documentation specification

Only supported integration contracts belong in the public API reference. Internal
dashboard transport must not be published as a stable API.

### API quickstart

The quickstart must show:

1. where a merchant creates an API key;
2. how to copy and store the key safely;
3. the base URL for a self-hosted installation;
4. one authenticated `curl` request;
5. a successful response;
6. an authentication failure;
7. the next links for products, orders, customers, licenses, and webhooks.

### Authentication

Document supported headers, key display/storage/revocation, expiry, common `401`
conditions, credential rotation, HTTPS requirements, and secret-handling examples.
Keep merchant API keys, customer authentication, license activation requests, and
webhook secrets as separate mechanisms.

### Shared conventions

Define base URLs, API versioning, content types, identifiers, timestamps, money
and currency, test/live environment behavior, optional/null fields, pagination,
filtering, sorting, rate limits, idempotency, and compatibility rules. If a feature
is unsupported, state that explicitly.

### Resource references

Create dedicated references for products, orders, and customers. Each endpoint
must document:

- method and path;
- purpose and stability;
- authentication and permissions;
- path/query/header parameters;
- request body schema;
- success status and complete response schema;
- all documented errors;
- example request and response;
- pagination/filtering behavior;
- test/live behavior;
- side effects and idempotency.

### License activation

Document activate, validate, and deactivate requests; installation identity;
license states; feature lists; expiry; activation limits; conflict responses;
retry guidance; and safe storage of license keys.

### Outbound webhooks

Document event names, subscription configuration, payload envelope, event-specific
data, signature headers and algorithm, verification steps, timestamp/replay
protection, delivery ID, retries, timeout, ordering, duplicates, test events,
delivery history, and manual resend.

Provider callbacks used internally by PayPal or Stripe setup may have an operator
guide, but they are not a consumer API unless a customer must implement them.

### OpenAPI

Maintain an OpenAPI 3.1 document for the supported public resource and license
contracts. It must include security schemes, schemas, examples, error responses,
and operation IDs. Do not include internal dashboard endpoints.

### Endpoint template

```markdown
## `METHOD /path`

One-sentence outcome.

**Stability:** Stable | Preview | Deprecated  
**Authentication:** Required mechanism  
**Environment:** Test | Live | Both

### Request

Parameters, headers, content type, body schema, validation, and defaults.

### Response

Success status, schema, and complete fake-data example.

### Errors

| Status | Meaning | Recommended action |
| --- | --- | --- |

### Idempotency and side effects

State whether the request is safe to retry and what it changes.

### Example

Runnable `curl` request using placeholder values.
```

## 9. Plain Markdown for coding AI and support agents

`public/AGENTS.md` and `public/docs/*.md` are operational runbooks for coding
agents that need to use Paymug features while developing, testing, or supporting
an integration. They describe product actions and API calls, not the repository's
source layout or implementation architecture. `docs/ai/README.md` is the index
for documentation authors.

The AI root is published separately from the repository. An agent may know only
the public base URL and the content of `/AGENTS.md`; every instruction must be
usable with that limited context.

### `product-overview.md`

Summarize what Paymug does, who pays whom, supported payment providers, test/live
modes, feature boundaries, and common terminology.

### `setup-and-test-environment.md`

Give a coding agent the minimum prerequisites and exact sequence for reaching a
usable test-mode store. Include required configuration categories, first account
and store setup, test/live safeguards, test credentials, and a readiness checklist.

### `feature-recipes.md`

Provide compact recipes for enabling and using major features. Every recipe must
contain goal, prerequisites, exact UI or API steps, expected state, verification,
cleanup/rollback, common failures, and links to rendered guides. Include products,
payments, checkout, files, subscriptions, discounts, campaigns, automations,
affiliates, licenses, GitHub delivery, API keys, and outbound webhooks.

### `merchant-workflows.md`

Represent each merchant workflow as prerequisites, steps, expected result,
failure symptoms, and related web guide.

### `customer-workflows.md`

Represent sign-in, purchase access, downloads, licenses, GitHub access, preferences,
and affiliate flows in the same compact format.

### `license-activation.md`

Provide a complete coding-agent runbook for activating Paymug Pro. It must cover:

- obtaining and safely supplying a license key;
- identifying the installation with `instanceId`, `instanceUrl`, and `appVersion`;
- activating, validating, and deactivating through the supported API;
- using the dashboard license settings when the task is interactive;
- interpreting `active`, `invalid`, `expired`, and `deactivated` states;
- reading the returned plan, feature list, management URL, expiry, and error;
- handling activation conflicts and an installation already active elsewhere;
- verifying that expected Pro features became available;
- retry rules, secret redaction, and cleanup after a test.

Include fake JSON and `curl` examples that a coding agent can adapt directly.

### `api-reference.md`

Provide a terse map of supported endpoints, authentication mechanisms, response
envelopes, errors, retry behavior, and links to the rendered API reference. Do not
include unsupported internal endpoints.

### `api-workflows.md`

Provide executable sequences for creating/storing an API key, listing products,
orders, and customers, handling authentication errors, selecting the correct test
or live context, rotating/revoking a key, and validating response assumptions.
Each sequence must include preconditions, commands, expected result, and safe
failure handling.

### `payment-and-checkout-testing.md`

Explain how a coding agent prepares sandbox credentials, selects a provider,
creates a test product, starts checkout, observes provider completion, verifies
the resulting order/delivery, tests cancellation/failure, and avoids live charges.

### `webhook-workflows.md`

Explain how a coding agent creates a webhook endpoint, selects events, stores its
secret, sends a test event, verifies the signature, deduplicates a delivery,
inspects history, resends a failed delivery, and safely tests retry behavior.

### `troubleshooting.md`

Use symptom-to-resolution entries with safe diagnostic questions. Never request
or expose full API keys, payment secrets, access tokens, or webhook secrets.

### `terminology.md`

Define product terms in user-facing language. Avoid class names, table names,
source paths, or framework terminology.

### AI feature-runbook template

Use this order for every operational feature entry:

```markdown
## Feature or task

Goal and final expected state.

### Required inputs

Non-secret inputs, secret placeholders, account permissions, environment, and
features that must already be enabled.

### Steps

Exact UI navigation and/or API requests in execution order.

### Expected result

Observable state, response fields, and enabled behavior.

### Verify

Checks that prove the task completed successfully.

### Errors and decisions

| Symptom or status | Meaning | Safe next action |
| --- | --- | --- |

### Retry and cleanup

Whether steps are safe to repeat, how to deactivate/revoke test state, and which
credentials or test data must be removed.

### References

Links to the rendered usage and API pages.
```

## 10. Rendering and writing rules

### Web-rendered guides and API pages

- Include `title`, `audience`, `render: web`, and `last-verified` front matter.
- Start with the outcome and prerequisites.
- Use short sections, numbered procedures, tables, and copyable examples.
- Add links to prerequisites, next steps, and troubleshooting.
- Provide descriptive image alt text if screenshots are added.
- Avoid implementation paths and repository links.

### Plain coding-AI/support files

- Include `audience: coding-ai-and-support` and `render: plain` metadata.
- Use public root-relative links (`/AGENTS.md`, `/docs/api-reference.md`), never
  repository-relative `docs/ai/...` or `public/docs/...` links.
- Keep sections compact and deterministic.
- Prefer exact commands, state tables, decision tables, and workflow checklists
  over prose.
- Link to rendered guides for detail.
- State uncertainty as `TODO: confirm`; never infer missing behavior.
- Include explicit secret-handling and escalation rules.
- For stateful features, include prerequisites, expected before/after state,
  verification, retry safety, and cleanup.

## 11. Execution plan

### Phase 1: Product inventory

- [ ] List all merchant dashboard pages and visible actions.
- [ ] List all storefront and customer portal workflows.
- [ ] List supported payment, delivery, marketing, affiliate, and operational
  features.
- [ ] List only the HTTP endpoints intended for external integration.
- [ ] Confirm feature availability, Pro restrictions, test/live differences, and
  user-visible limitations.

### Phase 2: Information architecture

- [ ] Create `docs/guides/`, `docs/customer/`, `docs/api/`, and `docs/ai/` indexes.
- [ ] Move or rewrite relevant existing usage content into the new structure.
- [ ] Remove codebase-reading pages from public documentation navigation.
- [ ] Add cross-links between merchant tasks, customer help, API reference, and
  troubleshooting.

### Phase 3: Merchant and customer guides

- [ ] Write onboarding, store setup, test/live, and payment setup.
- [ ] Write product, storefront, checkout, order, and customer guides.
- [ ] Write subscription, files, licenses, and GitHub delivery guides.
- [ ] Write discounts, campaigns, automations, affiliates, and analytics guides.
- [ ] Write API-key, webhook, backup/update, settings, troubleshooting, and FAQ.
- [ ] Write the focused customer-help collection.

### Phase 4: API reference

- [ ] Confirm the supported public API surface and versioning policy.
- [ ] Write quickstart, authentication, conventions, environments, and errors.
- [ ] Document products, orders, customers, and license activation.
- [ ] Document outbound event payloads and webhook verification.
- [ ] Add integration examples and an API changelog.
- [ ] Complete and review `openapi.yaml`.

### Phase 5: Coding-AI/support runbooks

- [x] Replace repository/coding context with operational product/API runbooks for
  coding agents.
- [x] Make `public/AGENTS.md` the public entry point at `/AGENTS.md`.
- [x] Store companion AI guides in `public/docs/` and link them as `/docs/*.md`.
- [ ] Check every public AI link against the deployed site.
- [x] Write setup/test-environment and feature-recipe documents.
- [x] Write the full Pro license activate/validate/deactivate runbook.
- [x] Write API, sandbox checkout, and outbound webhook execution workflows.
- [x] Write merchant and customer workflow summaries.
- [x] Write a supported API map and troubleshooting decision tree.
- [x] Ensure every AI workflow has prerequisites, exact actions, expected state,
  verification, safe retry behavior, cleanup, and rendered reference links.

### Phase 6: Usability review

- [ ] Follow every procedure from a clean test-mode account.
- [ ] Run every published API example with fake/test data.
- [ ] Check all links, headings, code blocks, navigation, and mobile rendering.
- [ ] Confirm no example contains a real credential or customer record.
- [ ] Confirm internal implementation details are absent from public pages.
- [ ] Record the verified product version on every rendered page.

## 12. Definition of done

Documentation is complete when:

- a new merchant can configure test mode and complete a first test sale using only
  the guides;
- a customer can sign in and access a purchase using only customer help;
- an integrator can create a key and successfully call every supported public API;
- every supported endpoint has complete request, response, error, environment,
  and retry documentation;
- webhook consumers can verify and deduplicate deliveries from the documentation;
- product limitations and Pro-only features are clearly labeled;
- troubleshooting covers the most common payment, delivery, email, GitHub,
  authentication, and webhook failures;
- coding-AI/support files let an agent activate and validate a license, prepare a
  test store, call supported APIs, test checkout, and verify webhooks without
  codebase-reading instructions;
- no public page depends on repository paths or implementation knowledge;
- all examples use test/fake data and all rendered pages record a verified version.

## 13. Progress tracker

| Area | Status | Next action |
| --- | --- | --- |
| Scope and target structure | Complete | Use this revised plan |
| Merchant/operator guides | Partial | Rewrite existing developer pages as usage guides |
| Customer help | Foundation complete | Expand focused customer pages |
| Public API reference | Foundation complete | Confirm supported schemas and complete examples |
| Outbound webhook reference | Foundation complete | Confirm payload/signature details per release |
| OpenAPI specification | Draft | Replace placeholder schemas with confirmed contracts |
| Coding-AI/support plain Markdown | Foundation complete | Keep `public/AGENTS.md` and `public/docs/` links root-relative |
| Usability review | Not started | Run after content rewrite |

## 14. Maintenance policy

Update documentation in the same release whenever a visible workflow, setting,
supported API contract, webhook event, permission, limit, or error behavior
changes.

For an API change, update the rendered endpoint reference, shared conventions or
errors if applicable, OpenAPI, integration examples, changelog, and AI API summary.

For a product workflow change, update the merchant/customer guide, related
troubleshooting entry, screenshots if present, and AI workflow summary. Mark stale
content as `TODO: confirm` until it is verified against the current product.
