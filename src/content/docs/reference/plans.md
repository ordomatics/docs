---
title: Plans
description: "Business, Developer and Partner: what each plan includes and what it costs."
---

Every plan runs the same Odoo 18. What differs is how much of the underlying
infrastructure and code is yours alone. You can move up a plan without migrating: it is
the same system throughout, so there is nothing to re-import and nobody to retrain.

| | Business | Developer | Partner |
|---|---|---|---|
| **Price** | 0€, plus usage credits | 49€ a month per deployment | 3950€ a year, or 395€ a month |
| **Users** | 1 per company | Unlimited | Unlimited |
| **Database** | Shared, isolated per company | Dedicated | Your own Postgres |
| **App and updates** | Shared, updates reach you automatically | Your own application | Your own applications |
| **Customization** | None | Your modules and your Dockerfile | Your modules and your Dockerfile |
| **Applications** | | One per subscription | Unlimited |
| **Cluster** | Shared | Shared | Your own Kubernetes cluster |
| **Code and images** | | A GitHub repository | Your own GitHub, and your own GitLab for images |

## Business

Your company on our shared Odoo, with nothing to run. It includes Smartacus Pro, a point
of sale, WhatsApp, an AI assistant, calls and SMS. You pay for what you use with
prepaid credits: you top up and draw down against actual use, with no annual commitment.

## Developer

For developers who build their own modules. An **application** is your repository, your
Dockerfile, a test environment and a live site. Each deployment costs
49€ a month.

You get a dedicated database, a dedicated GitHub repository for your custom modules,
CI/CD (push to `dev` to test, merge to `main` to release), test environments, and the
option to [bring your own database](/start/byo-postgres/).

Each client database has unlimited users. The exception is Odoo Enterprise: if you bring
in Enterprise modules, Odoo's own licence for them applies.

See [One application per sector](/blog/one-project-per-sector/) for how to organise
applications and clients.

## Partner

**Your infrastructure, our orchestration.** Everything in Developer, for teams that deploy
Odoo for their clients. You bring the pieces:

- **Your code**: on your own GitHub.
- **Your images**: built into your own GitLab registry.
- **Your Kubernetes cluster**: Linode, AWS, Azure, Google Cloud, DigitalOcean, or even a
  laptop. See [connect your own cluster](/start/byo-cluster/).
- **Your Postgres**: Neon, Supabase, a cloud database or a local one. See
  [bring your own database](/start/byo-postgres/).

We bring the orchestration that takes your Odoo from development to production: builds,
test environments, releases, upgrades and client onboarding. Your code, images, servers
and data stay yours; we only orchestrate.

You control your infrastructure costs, because you pay your providers directly, and you
deploy any number of Odoo applications for any number of clients. Custom infrastructure
support one day a week and platform migrations are included.

Partner costs **3950€ a year**, our best price, or 395€ a month.

## Billing

Business is billed in prepaid credits. Developer is a subscription per deployment. Partner
is a yearly or monthly subscription.
