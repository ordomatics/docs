---
title: "The boring alternative: CloudNativePG on three of your own servers"
date: 2026-09-18
excerpt: We ran the obvious alternative to self-hosted Neon on the same three VMs, broke it the same way, and deployed a real Odoo onto it. The database was the easy part.
authors:
  - name: Moctar Diallo
    title: Founder, Ordomatics
---

Two days ago we published what it took to run [self-hosted Neon on three ordinary
VMs](/blog/self-hosted-neon/): the storage-separated architecture, the operator's rough edges, and
what happened when we killed its components on purpose. The honest conclusion at the end of that
post was that for one client on one set of servers, CloudNativePG is simpler.

It seemed only fair to go and prove that, on the same hardware, with the same method: bring it up,
break it, measure it, and then make a real production system depend on it. Same three Linode VMs in
`eu-central`, same k3s, same acceptance test — an Odoo ERP deployment created through our own
platform, serving real users' requests from a database we host ourselves.

The short version: **the database took five minutes and never surprised us. Everything that went
wrong was our own platform assuming every database is a managed one.** That turns out to be the
more useful story, because it is the part nobody writes down.

## What CloudNativePG is, and what it is not

Neon separates storage from compute: pages live in an object store, durability is a replicated
quorum of safekeepers, and Postgres becomes stateless. That buys scale-to-zero and copy-on-write
branches, and it costs you a distributed storage system to operate.

CloudNativePG does none of that. It is an operator that runs **ordinary PostgreSQL** — one primary,
N replicas, streaming replication, each instance on its own disk. The cleverness is entirely in the
Kubernetes controller: it bootstraps the cluster, issues the certificates, manages the credentials,
watches the primary, promotes a replica when it dies, and moves the service endpoint to follow.

So: no scale-to-zero, no instant branches. In exchange, the failure modes are the ones every
Postgres DBA already knows, and the thing you are running in production is the most heavily
exercised database on earth rather than a young reimplementation of its storage layer.

For a client whose data must stay in Dakar, that trade is worth thinking about carefully, because
the components you cannot debug at 2am are the ones that will decide how you feel about this
choice.

## The lab

Three `g6-standard-4` VMs (4 vCPU, 8 GB), Ubuntu 24.04, `eu-central`. k3s with one server and two
agents joined over the private network. CloudNativePG 1.30.0, a `Cluster` of three instances,
PostgreSQL 18.4, `local-path` storage, and one instance per node enforced with

```yaml
affinity:
  podAntiAffinityType: required
  topologyKey: kubernetes.io/hostname
```

so that losing a node can never take two copies of the data with it.

## Bringing it up

Five minutes. Install the operator manifest, apply a `Cluster`, wait.

There is no blocker section in this post. For the Neon lab we needed seven of them: the published
operator image did not match its own manifests, half the YAML in the repository was from a previous
generation, fields that looked defaulted were required, the safekeeper names were load-bearing. Here
the CRD as documented is the CRD that runs. That difference is not a detail — it is most of a
working day, and it is the difference between "we deployed it" and "we understand what we deployed".

## What it hands you without being asked

**TLS.** The operator generates a CA, a server certificate and a replication certificate. Clients
get TLSv1.3 with no configuration.

**Credentials.** A superuser secret and a per-database owner secret, both as Kubernetes Secrets.
Nothing is ever typed into a manifest — which matters, because a password in a manifest ends up in
git, and then in everyone's laptop.

**Endpoints that survive failover.** Three services: `-rw` follows the primary, `-ro` serves the
replicas, `-r` serves anything. Your application connects to a name, and the name keeps meaning
"the primary" after the primary changes.

### One honest limitation: TLS is offered, not enforced

CloudNativePG's default `pg_hba.conf` requires a password but does not require TLS —
`sslmode=disable` connects. The natural fix is to add a rule:

```yaml
postgresql:
  pg_hba:
    - hostssl all all all scram-sha-256
```

This does not do what it looks like. The field is documented as lines *appended* to the file, and
the operator keeps its own permissive `host` rule below yours, so the plaintext-capable path stays
open. Password authentication is always required, so this is not an open door — but if your
compliance story needs TLS *enforced by the server*, this field is not where you get it. Our clients
connect with `sslmode=require`, so every connection is encrypted regardless; we would rather say
that plainly than imply an enforcement we do not have.

## Breaking it on purpose

The failure that matters for a single-region deployment is losing the machine the primary is on. We
stopped the k3s agent on that node — a real stop, not a reboot, which comes back too fast to prove
anything.

| Time | What we observed |
|---|---|
| 0s | primary healthy on node 1 |
| ~45s | node reported `NotReady` |
| ~180s | cluster: "Waiting for the instances to become active" |
| **~210s** | **replica on node 2 promoted, cluster healthy** |

Two things are worth pulling out of that table.

**The promotion happened before Kubernetes evicted anything.** The default toleration for an
unreachable node is 300 seconds; CloudNativePG promoted at ~210s. So the operator's own health
checks drove the failover, not pod eviction. You are not waiting on Kubernetes' timers.

**Nothing written before the failure was lost**, and the write that proved it went through the `-rw`
service rather than to a pod name — which is the realistic test, because that is what an application
does.

When we brought the node back, the old primary rejoined as a streaming replica on its own, and the
cluster returned to three healthy instances with no manual step.

We did not test a network partition that leaves the node running but unreachable, and we did not
test losing two nodes at once. Do not read this table as more than it is.

## Reaching it from the outside

A database only reachable from inside its own cluster proves nothing about hosting a client's data,
so — as with the Neon lab — we exposed it and connected from a machine on the other side of the
internet.

On bare k3s, `type: LoadBalancer` is klipper, which forwards the port on every node. Postgres
answered on the public IPs with TLSv1.3, accepted a real write, and correctly rejected a wrong
password.

The contrast with the Neon lab is the whole point: that cluster's compute terminates no TLS at all
and trusts loopback connections, so we had to put PgBouncer in front of it to have encryption and
real authentication at the edge. CloudNativePG needed **no extra component**. Fewer moving parts is
not an aesthetic preference when you are the one carrying the pager.

(Exposing Postgres to the internet is a deliberate choice with real consequences. We did it because
the alternative proves nothing, and because a client's own server is, by definition, not inside our
cluster.)

## Declaring a tenant instead of running SQL

Our first pass created the client's role and database with `psql`. That works, and it is exactly
what you should not do: nothing records it, and the next person has to guess. CloudNativePG lets you
declare both:

```yaml
managed:
  roles:
    - name: cnpgdemo
      ensure: present
      login: true
      passwordSecret:
        name: cnpgdemo-role
```

```yaml
apiVersion: postgresql.cnpg.io/v1
kind: Database
spec:
  cluster: { name: cnpg-lab }
  name: cnpgdemo
  owner: cnpgdemo
  databaseReclaimPolicy: retain
  extensions:
    - name: vector
      ensure: present
```

### The extension line is not decoration

Every Odoo image we ship includes a module that runs `CREATE EXTENSION vector` when it installs.
pgvector is **not a trusted extension**, so the database's own owner cannot create it:

```
ERROR: permission denied to create extension "vector"
```

The operator connects as superuser, so declaring the extension is the fix: no grants to hand out, no
superuser for the tenant, and it is written down in git rather than in someone's shell history.

**If you take one thing from this post for your own bring-your-own-database clients, take this
one.** Every coordinate can be correct — host, port, user, password, TLS — and the deployment still
cannot start, because the image expects an extension the client's role is not allowed to install.

## The part that actually cost us: our own platform

Here is the honest shape of the work. The database was ready in five minutes. Making our platform
deploy onto it took the rest of the day, and every problem was ours.

Our platform provisions Odoo deployments declaratively: a record in our own Odoo triggers a
Backstage template, which commits values files to git, which ArgoCD syncs onto the cluster. All of
it had only ever pointed at managed Neon. Pointing it at someone else's Postgres exposed seven
assumptions:

1. **The database name silently fell back to `odoo`.** A deployment bound to an external Postgres
   sent no database name at all, and the template's default is `odoo` — which exists on every Neon
   branch. On CloudNativePG, `odoo` was the bootstrap database owned by a different role, so the
   install failed with `permission denied for schema public`.
2. **Port and SSL mode never reached the chart.** The template accepted them and never passed them
   on, so every deployment rendered 5432/require no matter what the endpoint needed. Invisible on
   Neon and on CloudNativePG, because both happen to use exactly those values. It would have bitten
   the first client who runs Postgres on a different port.
3. **A failed database-upgrade Job could never run again.** Kubernetes Jobs are immutable and
   ArgoCD applies them once per name; the name came only from the image tag. So after we fixed the
   database, nothing reran — ArgoCD kept reading the same failed Job forever. The name now includes
   a hash of the configuration and an attempt counter that a **Retry Upgrade** button raises.
4. **The "wait for the upgrade to finish" gate had never worked.** The init container waited on a
   Job name that did not exist, and with no `set -e` the failure fell straight through to "upgrade
   completed". It had been passing vacuously for months.
5. **Failed upgrades deleted their own logs.** With `restartPolicy: OnFailure` the retries happen
   inside one pod, which the Job controller removes when it gives up — taking the only evidence
   with it. Now each attempt is its own pod and the failures stay.
6. **A deployment could not run an image its repo does not build.** The registry was derived from
   the app repo, so running the plain public Odoo image was impossible to express. The registry is
   now a property of the repo, and the tag a property of the deployment — because prod and test
   legitimately run different tags of the same app.
7. **A deployment whose sync ArgoCD had abandoned sat in "Pending" forever.** Health alone cannot
   tell you this: every rollout is `Degraded` for a while. The platform now reads ArgoCD's *sync
   operation* result, and only treats a failure as current if it happened at the revisions git
   currently points to — otherwise a redeploy would flip straight back to failed before ArgoCD had
   even noticed the new commit.

None of these are CloudNativePG's fault. All of them were latent, and a managed database had been
hiding every one.

## What a bring-your-own-database client actually is

We tried to run the demo as one more deployment inside our own client's ArgoCD project. ArgoCD
refused:

```
application repo .../clients/cnpgdemo/odoo.git is not permitted in project 'ordomatics'
```

That refusal was correct, and it taught us the shape. A project in our platform permits one client's
repos and one namespace prefix. A client running their own database is a *client*, so they need the
whole set: their own project, their own app repo, and a deployment whose name starts with the
project's name — because the deployment's name **is** its namespace.

We had assumed "bring your own database" was a property of one field on one record. It is not. It is
a tenancy boundary, and the platform was right to insist.

## The acceptance test

A deployment created through our own UI, on the public Odoo image, against the empty CloudNativePG
database:

| | |
|---|---|
| URL | `https://cnpgdemo.ordomatics.com` — `/web/health` and `/web/login` both 200 |
| Image | `docker.io/ordomatics/odoo:18.0` |
| Database | **310 tables, 57 modules installed**, base 18.0.1.3 |
| Connections | 10 live backends from the pods, TLSv1.3 |
| Path | record → Backstage template → git → ArgoCD. No manual `kubectl` |

Odoo installed its own schema into an empty database on three ordinary servers, over the public
internet, and serves from it.

## So which one should you run?

| | Self-hosted Neon | CloudNativePG |
|---|---|---|
| Time to a serving cluster | most of a day, patching manifests | ~5 minutes |
| TLS at the edge | none; needs PgBouncer in front | generated, on by default |
| Failure we measured | pageserver is a total-outage single point | replica promoted at ~210s, no data lost |
| Scale to zero | no | no |
| Copy-on-write branches | no (the self-hosted operator has no parent field) | no |
| Declarative tenants | no | roles, databases and extensions as resources |
| What you debug at 2am | a young storage layer, in Go | PostgreSQL |

For one client, on their own servers, in their own country: **CloudNativePG**. Self-hosted Neon
earns its place when the client already runs one, or when you specifically need the architecture
rather than the database.

And the wider lesson, which cost us more than the database did: if your platform has only ever
talked to a managed service, it is full of assumptions you cannot see. The fastest way to find them
is to point it at a database you host yourself — and to do it on a demo, before a client's data is
on the line.
