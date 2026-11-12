---
title: "Set up your infrastructure"
description: Connect your GitLab, your Kubernetes cluster and your Postgres server once, then create as many applications as you like on them.
---

On any plan, your applications can run on your own infrastructure, ours, or a mix: your
images and backups in your GitLab, your Odoo on your Kubernetes cluster, your data on your
Postgres server. You connect each of them **once**, on your account; every application you
create can then use them. We orchestrate: build, deploy, update, back up.

**Projects** shows a **Your infrastructure** link. The page is a board: images and backups
in a bar at the top, clusters on the left (**Runs on**) and Postgres servers on the right
(**Data**). Ours are always there, named **ordomatics**; yours appear beside them as you
connect them. Each application has its own colour, the same wherever it appears, so you can
follow it from the cluster it runs on to the server that holds its data.

Each piece opens a page of its own, with what you can do on the left, and **At a glance**
and **Activity** (what happened to it, and who did it) on the right. **Ask about this**, on
each of those pages, opens a support question that already carries what the page shows.

## 1. Your GitLab

Your GitLab project holds every application's images and backups.

1. On gitlab.com (or your own GitLab), create an **empty project**, for example
   `acme/odoo-images`. Leave its container registry and package registry on
   (*Settings > General > Visibility*).
2. In that project, open *Settings > Access tokens* and add a token with the
   **Maintainer** role and the **api** scope.
3. On **Your infrastructure**, click **Connect GitLab** and fill in:
   - **GitLab:** `https://gitlab.com`, or your own GitLab's address.
   - **Project path:** `acme/odoo-images`.
   - **Registry address:** only for your own GitLab, for example `registry.example.com`.
   - **Access token:** the token from step 2.
4. Click **Save and check**.

We use your token to issue narrower ones: one to pull images, one to write backups, and one
per application for its GitHub CI to push its image. Each application's images live under
their own path, for example `registry.gitlab.com/acme/odoo-images/pharma`. Their storage
counts towards your GitLab account.

To change the token later, open GitLab's page and click **Replace the access token**. The project itself can't be
changed once it is ready.

| The page says | Do |
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

1. Click **+ Connect a cluster**, type a name, for example `onprem`, and click
   **Connect a cluster**. Its page opens.
2. Run the four commands shown under it, then paste the token the fourth one prints and
   click **Connect**. The commands and what each one does are in
   [Bring Your Own Cluster](/start/byo-cluster/#3-run-the-four-commands).

The cluster's badge turns **Connected**, with its Kubernetes version. You can connect
several clusters (**Add another cluster**), and choose one for each application.

We ask each connected cluster every five minutes whether it answers, and the row says when
it last did. When it stops, its row turns **Not answering**, with the reason, and its page
says how to fix it. **Check again**, on its page, asks it right away.

| The page says | Do |
|---|---|
| The connector on your cluster is not connected to us | Check the machine is on and online, and `kubectl -n ordomatics-system get pods` |
| The connector is running, but your cluster's API did not answer it | If the machine's address changed, renew its certificate. On MicroK8s: `sudo microk8s refresh-certs --cert server.crt` |
| Your cluster refused our access token | The token was deleted or replaced on the cluster; connect it again |
| Your cluster did not answer within 10 seconds | Check the machine is on and its network |
| We no longer hold a connection to your cluster | It shows **Connect it** again with the usual commands. The connector is already installed, so run only the last command and paste the token it prints |

**Disconnect**, at the bottom of a cluster's page, is only offered while nothing runs on it.

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

Then click **+ Add your Postgres server** and fill in **Host**,
**Port**, **TLS**, **Admin user** (`ordomatics`), **Admin database** (`postgres`) and
**Password**, and click **Save and check**. If you have a cluster connected, we check from
inside it, so a server reachable only from there works.

We keep this login's password: each new application's database is created with it. To
change it, open the server's page and click **Change the admin login**. **Check again**
runs the checks once more with the login we hold. The host can't be changed while
applications have databases on it; **Databases we made here** lists them.

You can add more servers (**+ Add a Postgres server** on the board), for example one for
production data and one for tests, and choose one for each application. A server nothing
has a database on any more can be removed from its page: we forget its admin login, and the
server and its data stay yours.

| The page says | Do |
|---|---|
| the server refused the password for `<user>` | Retype the password |
| that host name does not resolve / nothing answers on port `<port>` | Fix the host or port, and check the server accepts connections from where the check runs |
| the encrypted connection failed; check the TLS setting | Pick a TLS mode the server supports |
| The user needs the CREATEDB and CREATEROLE rights | `ALTER ROLE ordomatics CREATEDB CREATEROLE;` |
| The pgvector extension is not available on the server | Install the pgvector package on the server |
| Only a superuser can install pgvector on this server | As a superuser: `\c template1` then `CREATE EXTENSION vector;` |
| A user or database named `odoo_<address>` already exists and was not made by us | Rename or drop it, or give the application another address |
| A database named `odoo_<address>_<name>` already exists on your server and was not made by us | Rename or drop it, or give the database another name |

## 4. Create an application

Click **Create an application** (or **Create a project** on **Projects**). Give it a
**name** and an **address**; the address is permanent and becomes
`https://<address>.ordomatics.com`, checked as you type. Then choose where it runs, each
one **ordomatics** or one of yours:

- **Servers:** a cluster. One that is not answering cannot be chosen.
- **Database:** a Postgres server, where we create its own database, or a database of
  your own by its connection details.
- **Images and backups:** a GitLab project. On your own cluster, images come from your own
  GitLab: our registry's credentials never go on a cluster that is not ours.

Click **Create project**. Setup creates a role and a database for the application on your
server, both named `odoo_` and its address (`odoo_pharma_shop` for `pharma-shop`), with
pgvector in it, then deploys. When the page says **Ready**, continue with
[Getting started](/start/getting-started/#2-create-your-repository) from step 2: create
your repository, connect GitHub and ship your module. Its CI pushes the image to your
GitLab.

Create the next application the same way: nothing on the infrastructure page is asked
again.

## More databases for an application

On an environment on your server, **Add a database** creates another database there, owned
by the application's user and with pgvector, and gives it its own address: `branch-2` on
`pharma-shop` is `odoo_pharma_shop_branch_2`, served at
`https://branch-2.pharma-shop.ordomatics.com` on our cluster, or
`https://branch-2-pharma-shop.ordomatics.com` when the application runs on your own
cluster (reached through Cloudflare, whose certificate covers one level under
`ordomatics.com`). It gets the same application and modules. If adding it stops on a
problem, the round **↻** button next to its status picks it up where it stopped. The
prefix keeps it apart from your own databases and other applications' on the same server;
the server's page lists them all.

Removing one stops serving it and forgets it; its data stays on your server
(`DROP DATABASE odoo_pharma_shop_branch_2;` when you no longer need it).

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
