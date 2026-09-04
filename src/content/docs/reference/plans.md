---
title: Plans
description: How Ordomatics deployments are isolated, and what that means.
---

Every plan runs the same Odoo 18. What differs is how much of the underlying
infrastructure is yours alone.

| Plan | Deployment | Database | Cluster |
|---|---|---|---|
| **Attached** | Shared | Shared, isolated per tenant | Shared |
| **Dedicated** | Your own | Your own | Shared |
| **Isolated** | Your own | Your own | Your own |

You can move up a plan without migrating: it is the same system throughout, so
there is nothing to re-import and nobody to retrain.

## Billing

Prepaid credits. You top up and draw down against actual use — no per-seat
licences and no annual commitment.
