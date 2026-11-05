---
title: "Partner: set up your infrastructure"
description: Connect your GitLab, your Kubernetes cluster and your Postgres server once, then create as many applications as you like on them.
---

On the [Partner plan](/reference/plans/#partner), your applications run on your
infrastructure: your code in your GitHub, your images and backups in your GitLab, your
Odoo on your Kubernetes cluster, your data on your Postgres server. You connect each of
them **once**, on your account; every application you create then uses them. We
orchestrate: build, deploy, update, back up.

Once your Partner plan is active, **Projects** shows a **Your infrastructure** link. The
page has three cards, numbered while you set them up, with a count at the top (**2 of 3
ready**) and what is still missing. When all three are **Ready**, **Create an application**
appears at the top. Each card says when it was last checked and which applications use it,
and **Applications** at the bottom lists them with their cluster and database.

## 1. Your GitLab

Your GitLab project holds every application's images and backups.

1. On gitlab.com (or your own GitLab), create an **empty project**, for example
   `acme/odoo-images`. Leave its container registry and package registry on
   (*Settings > General > Visibility*).
2. In that project, open *Settings > Access tokens* and add a token with the
   **Maintainer** role and the **api** scope.
3. On **Your infrastructure**, open **Your GitLab project** and fill in:
   - **GitLab:** `https://gitlab.com`, or your own GitLab's address.
   - **Project path:** `acme/odoo-images`.
   - **Registry address:** only for your own GitLab, for example `registry.example.com`.
   - **Access token:** the token from step 2.
4. Click **Save and check**.

We use your token to issue narrower ones: one to pull images, one to write backups, and one
per application for its GitHub CI to push its image. Each application's images live under
their own path, for example `registry.gitlab.com/acme/odoo-images/pharma`. Their storage
counts towards your GitLab account.

To change the token later, open **Replace the access token**. The project itself can't be
changed once it is ready.

| The card says | Do |
|---|---|
| GitLab refused the token: it is wrong, expired or revoked | Create a new token and paste it |
| The token needs the "api" scope | Create a token with the `api` scope |
| The token cannot see the project | Check the path, and that the token was created on that project |
| The token needs the Maintainer role on the project | Create the token with the Maintainer role |
| The container registry / package registry is switched off | Turn it on in *Settings > General > Visibility* |

## 2. Your cluster

Your applications run on a Kubernetes cluster you have, even one with no public address.
Check that it meets the requirements first:
[Bring Your Own Cluster, step 1](/start/byo-cluster/#1-prepare-the-cluster).

1. In the **Clusters** card, type a name, for example `onprem`, and click
   **Connect a cluster**.
2. Run the four commands shown under it, then paste the token the fourth one prints and
   click **Connect**. The commands and what each one does are in
   [Bring Your Own Cluster](/start/byo-cluster/#3-run-the-four-commands).

The cluster's badge turns **Connected**, with its Kubernetes version. You can connect
several clusters (**Add another cluster**), and choose one for each application.

We ask each connected cluster every five minutes whether it answers, and the row says when
it last did. When it stops, the badge turns **Not answering**, with the reason. **Check
again** asks it right away.

| The row says | Do |
|---|---|
| The connector on your cluster is not connected to us | Check the machine is on and online, and `kubectl -n ordomatics-system get pods` |
| The connector is running, but your cluster's API did not answer it | If the machine's address changed, renew its certificate. On MicroK8s: `sudo microk8s refresh-certs --cert server.crt` |
| Your cluster refused our access token | The token was deleted or replaced on the cluster; connect it again |
| Your cluster did not answer within 10 seconds | Check the machine is on and its network |

**Disconnect** is only offered while nothing runs on the cluster.

## 3. Your Postgres server

Each application gets its own database on your server, created by us.

You need PostgreSQL with TLS turned on and the pgvector extension available (see
[Prepare your server](/start/prepare-your-server/#your-postgres)), and a login that can
create databases and roles. It does not need to be a superuser. As a superuser, once:

```sql
CREATE ROLE ordomatics LOGIN PASSWORD '<choose-a-strong-password>' CREATEDB CREATEROLE;
\c template1
CREATE EXTENSION vector;
```

The last line matters: only a superuser can install pgvector on a self-hosted server, and
every new database is copied from `template1`, so each application's database comes with
it. Managed services (Neon, Supabase) let their admin user install it, so there you can
skip it.

Then, in the **Postgres server** card, open **Your Postgres server** and fill in **Host**,
**Port**, **TLS**, **Admin user** (`ordomatics`), **Admin database** (`postgres`) and
**Password**, and click **Save and check**. If you have a cluster connected, we check from
inside it, so a server reachable only from there works.

We keep this login's password: each new application's database is created with it. To
change it, open **Change the admin login**. **Check again** runs the checks once more with
the login we hold. The host can't be changed while applications have databases on it; the
card lists them.

| The card says | Do |
|---|---|
| the server refused the password for `<user>` | Retype the password |
| that host name does not resolve / nothing answers on port `<port>` | Fix the host or port, and check the server accepts connections from where the check runs |
| the encrypted connection failed; check the TLS setting | Pick a TLS mode the server supports |
| The user needs the CREATEDB and CREATEROLE rights | `ALTER ROLE ordomatics CREATEDB CREATEROLE;` |
| The pgvector extension is not available on the server | Install the pgvector package on the server |
| Only a superuser can install pgvector on this server | As a superuser: `\c template1` then `CREATE EXTENSION vector;` |
| A user or database named `odoo_<address>` already exists and was not made by us | Rename or drop it, or give the application another address |

## 4. Create an application

When the three cards are **Ready**, click **Create an application** (or **Create a
project** on **Projects**). Give it a **name** and an **address**; the address is
permanent and becomes `https://<address>.ordomatics.com`. The rest is shown, not asked:

- **Runs on:** your cluster, or a choice when you have several.
- **Database:** a new database of its own on your server.
- **Images and backups:** in your GitLab project.

Click **Create project**. Setup creates a role and a database for the application on your
server, both named `odoo_` and its address (`odoo_pharma_shop` for `pharma-shop`), with
pgvector in it, then deploys. When the page says **Ready**, continue with
[Getting started](/start/getting-started/#2-create-your-repository) from step 2: create
your repository, connect GitHub and ship your module. Its CI pushes the image to your
GitLab.

Create the next application the same way: nothing on the infrastructure page is asked
again.

## Removing an application

**Delete project** removes the application, its environments and the connection details we
hold, and revokes its push token in your GitLab. It does not touch your server: the
application's database and role stay there, and so do its images and backups in your
GitLab. Drop them yourself when you no longer need them:

```sql
DROP DATABASE odoo_pharma_shop;
DROP ROLE odoo_pharma_shop;
```

## What stays ours

The deployment configuration (how each application is set up on your cluster) stays in
our repository; that is the orchestration you pay for. Files attached in Odoo go to a
storage bucket that only that application can open.
