---
title: Paymug documentation
audience: users-and-integrators
render: web
---

# Paymug documentation

Paymug is a self-hosted digital-product and subscription commerce application
running on Next.js, Cloudflare Workers, D1, R2, and Drizzle ORM.

## Choose a guide

### Store owners and operators

The [usage guides](guides/README.md) explain setup, payments, products, checkout,
delivery, customers, marketing, and operations.

### API consumers

The [API guide](api/README.md) explains authentication and the supported public,
customer, storefront, provider, and outbound webhook contracts.

### Coding AI agents

The [AI root](/AGENTS.md) is plain Markdown for agents that need to use Paymug
features and APIs. Its source is `public/AGENTS.md`; related AI guides are stored
in `public/docs/` and published under `/docs/`.

## Documentation rules

`docs/DOCS.md` is the maintenance plan and completeness checklist. Code and
configuration remain the source of truth. Every public contract document records
the commit or release against which it was last verified.

## Current status

The documentation plan is in `docs/DOCS.md`. Claims marked `TODO: confirm` must
not be treated as stable behavior.
