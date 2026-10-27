---
title: Bring Your Own Postgres
description: Run your project against a Postgres database you operate, on your own server.
---

Your data stays on your server. Ordomatics runs Odoo, and Odoo connects to a PostgreSQL
database that you own and back up.

Do [Prepare your server](/start/prepare-your-server/) first: it lists what the database
needs (an owned database, TLS, the `pg_trgm`, `unaccent` and `vector` extensions) and
gives a command to test it.

## Two ways to use it

**From the start.** On the *Create project* form, open **Database** and choose
**Yours**. Fill in the host, port, TLS mode, database, user and password. Servers can
stay ours or be your cluster too: see [Bring Your Own Cluster](/start/byo-cluster/).

**Later, as an extra environment.** On a project that already runs on our database, open
**On your own database server** on the project page. Give the environment a name, choose
which releases it follows (production or test), say where it runs (our servers, or one of
your clusters), enter the connection and press **Connect and create**.

## What happens

1. **Checking your database.** Before anything is built we connect and verify it. If the
   cluster is yours, the check runs from inside it, so a database that is only reachable
   from your private network works.
2. **Seeding.** An empty database is filled on the first deploy. An existing Odoo 18
   database is used as it is; the check reports the Odoo version it found.
3. **Serving.** Odoo's pods connect with the details you gave. Your password is kept only
   until the check succeeds, then lives in a Kubernetes secret.

### If the check fails

The project page shows the real reason (wrong password, unreachable host, missing
extension), not a generic error. Open **Correct the connection and try again**, fix the
details and resubmit. You do not recreate the project. We tested this with a deliberately
wrong password: the page showed the failure, and correcting it let setup continue.

## What changes when the database is yours

- **No test copies.** Copies of production are made with our database's branching, so a
  project on your database offers only environments that run on **their own database**:
  give each environment its own database and connect it as above.
- **Distance is latency.** Every page talks to your database. The further it is from the
  servers running Odoo, the slower it gets. The best setup puts them in the same place:
  your database with [your cluster](/start/byo-cluster/).
- **Backups are yours.** We do not back up a database we do not run.
- **Files stay with us.** Attachments go to a storage bucket that only your project can
  open, whatever database you use.

## Removing it

Disconnecting a database deletes the connection secret on the platform. It never touches
anything on your server: your data and your role stay as they are.

## We ran this

We tested it with a project on a laptop: Postgres in a pod, the project's site running
beside it. A wrong password was reported and corrected from the portal, the site came up
with its data in that Postgres, and deleting the project left the database untouched.
[Prepare your server](/start/prepare-your-server/#try-it-on-a-laptop) shows how to set up
the same thing.
