---
title: Plans
description: "Business, Developer and Partner: what each plan includes and what it costs."
---

Every plan runs the same Odoo 18. What differs is how much of the underlying
infrastructure and code is yours alone. You can move up a plan without migrating: it is
the same system throughout, so there is nothing to re-import and nobody to retrain.

| | Business | Developer | Partner |
|---|---|---|---|
| **Price** | 0€, plus usage credits | 49€ a month per application | 395€ a month |
| **Users** | 1 per company | Unlimited | Unlimited |
| **Database** | Shared, isolated per company | Dedicated | Dedicated |
| **App and updates** | Shared, updates reach you automatically | Your own application | Your own applications |
| **Customization** | None | Your modules and your Dockerfile | Your modules and your Dockerfile |
| **Applications** | | One per subscription | Unlimited |
| **Cluster** | Shared | Shared | Dedicated, or your own |

## Business

Your company on our shared Odoo, with nothing to run. You pay for what you use with
prepaid credits: you top up and draw down against actual use, with no annual commitment.

## Developer

For developers who build their own modules. An **application** is your repository, your
Dockerfile, a test environment and a live site. The first client is included in the 49€
a month, and each additional client of the application costs 25€.

You get a dedicated database, a dedicated GitHub repository for your custom modules,
CI/CD (push to `dev` to test, merge to `main` to release), test environments, and the
option to [bring your own database](/start/byo-postgres/).

Each client database has unlimited users. The exception is Odoo Enterprise: if you bring
in Enterprise modules, Odoo's own licence for them applies.

See [One application per sector](/blog/one-project-per-sector/) for how to organise
applications and clients.

## Partner

Everything in Developer, for teams that deploy Odoo for their clients on infrastructure of
their own: unlimited applications, a dedicated cluster (or
[your own Kubernetes cluster](/start/byo-cluster/)), custom infrastructure support one day
a week, and platform migrations. You pay for the cluster itself.

## Billing

Business is billed in prepaid credits. Developer and Partner are monthly subscriptions.
