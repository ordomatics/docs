---
title: Bring Your Own Postgres
description: Step by step, run your project against a PostgreSQL database on your own server.
---

Your data stays on your server. Ordomatics runs Odoo, and Odoo connects to a PostgreSQL
database that you own and back up. This page goes from an empty server to a running site.
Replace `myproject` and the example host with your own.

If you also want your own Kubernetes cluster, do this page first, then
[Bring Your Own Cluster](/start/byo-cluster/).

## 1. Prepare the database server

You need PostgreSQL 12 or newer (15 or newer recommended) with TLS turned on. See
[Prepare your server](/start/prepare-your-server/#your-postgres) for the full list of
requirements. As a PostgreSQL superuser:

```sql
CREATE ROLE odoo LOGIN PASSWORD '<choose-a-strong-password>';
CREATE DATABASE myproject OWNER odoo;
\c myproject
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS vector;
```

The `vector` extension needs the pgvector package installed on the server. The role
`odoo` does not need superuser rights; it only needs to own the database.

Make sure the server accepts connections from where Odoo will run:
- **On our servers:** from the public internet, with TLS. Allow only our egress addresses if you can.
- **On your own cluster:** from inside it. A private address or an in-cluster name is fine.

## 2. Test it before you use it

From a machine in the same network as Odoo will run (or from a pod in your cluster):

```bash
psql "postgresql://odoo:<password>@db.example.com:5432/myproject?sslmode=require" \
  -c "select version();" -c "\dx"
```

You should see the version and three extensions: `pg_trgm`, `unaccent`, `vector`. If
this fails, the portal's check fails the same way: fix it here first.

## 3. Create the project with your database

1. In the [portal](https://odoo.ordomatics.com), open **Projects** and click **Create a project**.
2. Give it a **name** and an **address**. The address is permanent: it becomes
   `https://<address>.ordomatics.com`.
3. Open **Database** and choose **Yours**.
4. Fill in:
   - **Host:** `db.example.com`. If you use a pooler, the pooled address.
   - **Port:** `5432` unless yours differs.
   - **TLS:** `require`, or `verify-full` / `verify-ca` if you want the certificate checked.
   - **Database:** `myproject`.
   - **User:** `odoo`.
   - **Password:** the one you set.
5. Leave **Servers** as ours (or see [Bring Your Own Cluster](/start/byo-cluster/)).
6. Click **Create project**.

The setup page follows along on its own. Among the steps you will see
**Checking your database**: we connect to it before anything is built.

### If the check fails

The project page shows the real reason (wrong password, host unreachable, a missing
extension). Open **Correct the connection and try again**, fix the host, port, TLS mode,
database, user or password, and click **Check again**. You don't recreate the project.
Type the password again when you correct: it is kept only until a check succeeds.

| The page says | Do |
|---|---|
| the server refused the password for `<user>` | Retype the password. It is not kept after a failed check |
| there is no user `<user>` / no database `<name>` on that server | Create the role or the database (step 1), or fix the name |
| that host name does not resolve | Fix the host |
| nothing answers on port `<port>` there / the server did not answer in time; a firewall may be in the way | Check the port, and that the server accepts connections from where Odoo runs |
| the server does not accept connections from our address for that user | Add a `pg_hba.conf` entry for it |
| the encrypted connection failed; check the TLS setting | Pick a TLS mode the server supports |
| The connection is not encrypted | Turn on TLS on the server. We refuse a database that doesn't encrypt |
| The user does not own the database | `ALTER DATABASE <name> OWNER TO <user>` |
| The pgvector extension is not installed in the database | `CREATE EXTENSION vector;` in that database |
| This database runs Odoo X, and this project runs Odoo 18 | Migrate it to 18 first, or use an empty database |

When the check passes, setup builds the rest. An empty database is filled on the first
deploy; an existing Odoo 18 database is used as it is (the check reports the Odoo version
it found). When the page says **Ready**, open `https://<address>.ordomatics.com`.

Then continue with [Getting started](/start/getting-started/#2-create-your-repository)
from step 2: create your repository, connect GitHub and ship your module.

## 4. Add your database to a project that already exists

1. Open the project in the portal.
2. Open **On your own database server**.
3. Fill in:
   - **Environment name**, for example `onprem`. The environment will be served at
     `https://<project>-onprem.ordomatics.com`.
   - **Follows the releases of:** `production` or `test`.
   - **Runs on:** our servers, or one of your connected clusters.
   - **Host**, **Port**, **TLS**, **Database**, **User**, **Password** as above.
4. Click **Connect and create**.

The same check runs, and the same correction form appears if it fails.

## 5. Check that it works

```bash
psql "postgresql://odoo:<password>@db.example.com:5432/myproject?sslmode=require" \
  -c "select name, state from ir_module_module where state = 'installed' limit 5;"
```

You should see Odoo's modules: the data is in your database.

## 6. Back it up

We do not back up a database we do not run. A nightly dump is a minimum:

```bash
pg_dump -Fc "postgresql://odoo:<password>@db.example.com:5432/myproject?sslmode=require" \
  > myproject-$(date +%F).dump
```

Restore with `pg_restore -d <database> myproject-<date>.dump`.

## What changes when the database is yours

- **No test copies.** Copies of production are made with our database's branching, so a
  project on your database only offers environments that run on a database of their own.
  Create each as in step 4, with its own database.
- **Distance is latency.** Every page talks to your database. Keep it close to the
  servers running Odoo, ideally with [your cluster](/start/byo-cluster/).
- **Files stay with us.** Attachments go to a storage bucket that only your project can open.

## Removing it

**Delete project** (on the project page, type the project address to confirm) removes the
project, its environments, its files and the connection details we hold. It never touches
anything on your server: your database and your role stay as they are, and so do your backups.

## We ran this

We tested it on a laptop: Postgres in a pod, with the project's site beside it. A wrong
password was reported and corrected from the portal, the site came up with its data in that
Postgres, and deleting the project left the database untouched. The laptop recipe is in
[Prepare your server](/start/prepare-your-server/#try-it-on-a-laptop).
