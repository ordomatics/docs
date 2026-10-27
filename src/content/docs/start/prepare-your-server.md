---
title: Prepare your server
description: What your Kubernetes cluster and Postgres need before Ordomatics can deploy onto them.
---

Do this **before** you pick "your own database" or "your own cluster" when creating a
project. It takes about 15 minutes if the pieces already exist. Each section ends with a
command that proves the requirement is met.

You can bring either one on its own: your database with our servers, our database with
your cluster, or both. Only follow the sections you need.

## What stays with Ordomatics

Even with both of yours, these remain ours: your code repository, the container
registry, and the **filestore** (attachments, in a bucket that only your project can
open).

:::caution
Our shared service keys (WhatsApp, SMS and telephony, AI providers) are **never copied
onto a cluster we don't run**, because anyone with admin on it can read every Secret in
it. Features that depend on them need your own account keys, set in the project.
:::

## Your Kubernetes cluster

### Requirements

| Need | Why |
|---|---|
| Kubernetes **1.29 or newer** | Checked when you connect the cluster; older versions are refused. |
| `kubectl` with **cluster-admin** for the one-time connection | The connection manifest creates a namespace, a service account and the roles our ingress controller needs. |
| **Outbound** internet from the nodes. No inbound port, no public IP, no load balancer | A small connector (`cloudflared`, 2 replicas) dials out to Cloudflare, and we reach your API and your sites through that tunnel. Cloudflare needs outbound port 7844 (TCP/UDP). Behind a strict firewall, allow it. |
| Nodes can pull from public registries | Our image from GitLab's registry, plus Docker Hub (`redis`, `cloudflare/cloudflared`, `nginxinc/nginx-unprivileged`, `bitnami/kubectl`) and the ingress-nginx chart images. |
| A **default StorageClass** | Each environment keeps a small Redis volume. |
| Nothing else answering for ingress | We install `ingress-nginx`. An existing ingress controller on the same cluster is not supported. |

### Capacity

Sizes are chosen per environment. A **Small** environment (1 server, 2 workers) asks for
about **3 GiB of memory and 0.3 CPU** as a baseline and may use up to about 5.5 GiB.
Medium and Large scale up from there.

As a starting point, give the cluster **8 GB of memory in total, and at least 4 GB on
any single node**. A single 4 GB node is too small: pods will sit in `Pending`.
Add what the cluster already runs on top.

### Trust

The connection manifest gives the `ordomatics` service account **cluster-admin**,
because it installs cluster-wide pieces. Use a cluster dedicated to this, or accept that
Ordomatics operates it.

### Check it

```bash
kubectl version                                  # Server: v1.29 or newer
kubectl get storageclass                         # one marked "(default)"
kubectl auth can-i '*' '*' --all-namespaces      # yes
```

Your site is served at `<project>.ordomatics.com`.

### Connecting it

When you create the project, the portal's **Your own clusters** card shows four commands
with your tunnel token already filled in. Run them in order:

1. Create the namespace for our connector.
2. Create the `cloudflared` secret. Its value is the **tunnel key**: it lets the
   connector reach us and stays on your cluster.
3. Apply the connector manifest.
4. Print the **cluster token**.

Two things go wrong here:

- **Two different tokens.** Paste only the token printed by step 4 into the portal. The
  key from step 2 is not it; the portal answers "refused the token".
- **Wrong cluster.** `kubectl` runs against your current context, which may be an old
  or dead cluster. Check `kubectl config current-context` before step 2.

If the portal says the connector is not running or cannot reach us, the nodes can't
reach Cloudflare (see the port above). Fix that and connect again.

### After you disconnect

Disconnecting the cluster from the project removes the connector, our ingress add-on and
the cluster-admin binding. Confirm, and delete by hand if anything is left:

```bash
kubectl get ns ordomatics-system
kubectl get clusterrolebinding ordomatics
```

## Your Postgres

### Requirements

| Need | Why |
|---|---|
| PostgreSQL **12 or newer** (Odoo 18's minimum; 15 or newer recommended) | Plain Postgres and self-hosted Neon both work. |
| A **database** (default name `odoo`) **owned by the role** you give us | Odoo creates its tables in it. The role must be able to create tables, but needs no superuser rights. |
| An **empty** database, or an existing Odoo 18 database | We seed an empty one on the first deploy. For an existing one, we report the Odoo version we found. |
| Reachable from where Odoo runs | With **your cluster**: from inside it. Private addresses and in-cluster names such as `pg.customer-db.svc.cluster.local` are fine, because the check runs from inside your cluster. With **our cluster**: from the public internet, with TLS, restricted to our egress if you can. |
| TLS | Pick the mode when you register. Use `require` or stronger over the internet. |
| If you use a pooler (PgBouncer, Neon pooler) | Give both addresses: the pooled **host** for Odoo, and the **direct** host for backups and long jobs. With no pooler, leave the direct host empty. |

### Extensions

Create these once, as a superuser, so the application role doesn't need to be one:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS vector;   -- pgvector; the AI knowledge features use it
```

The `vector` extension needs the pgvector package installed on the server (for example
the `pgvector/pgvector` image).

### Backups

The database is yours, so **backups are yours**. Set them up before you go live.

### Check it

From a machine in the same network as Odoo will run (or a pod in your cluster):

```bash
psql "postgresql://<role>:<password>@<host>:5432/<database>?sslmode=require" \
  -c "select version();" -c "\dx"
```

You should see the version and the three extensions. The password is only kept until
the connection check succeeds. If the check fails, the portal shows the real reason,
and you can correct the details there and try again.

## Try it on a laptop

The whole setup works on one machine with microk8s, which is how we tested it. The site
is only up while the laptop is on and awake.

```bash
sudo snap install microk8s --classic
microk8s enable dns hostpath-storage      # not "ingress": we install our own
microk8s kubectl version                  # v1.29 or newer
```

Run Postgres inside it (change the password):

```bash
microk8s kubectl create namespace customer-db
microk8s kubectl -n customer-db create secret generic pg --from-literal=password=<choose-one>
microk8s kubectl -n customer-db apply -f - <<'EOF'
apiVersion: apps/v1
kind: StatefulSet
metadata: {name: pg}
spec:
  serviceName: pg
  replicas: 1
  selector: {matchLabels: {app: pg}}
  template:
    metadata: {labels: {app: pg}}
    spec:
      containers:
        - name: pg
          image: pgvector/pgvector:pg17
          env:
            - {name: POSTGRES_PASSWORD, valueFrom: {secretKeyRef: {name: pg, key: password}}}
            - {name: PGDATA, value: /var/lib/postgresql/data/pgdata}
          ports: [{containerPort: 5432}]
          volumeMounts: [{name: data, mountPath: /var/lib/postgresql/data}]
  volumeClaimTemplates:
    - metadata: {name: data}
      spec: {accessModes: [ReadWriteOnce], resources: {requests: {storage: 10Gi}}}
---
apiVersion: v1
kind: Service
metadata: {name: pg}
spec:
  selector: {app: pg}
  ports: [{port: 5432}]
EOF
```

Create the database and the extensions:

```bash
microk8s kubectl -n customer-db exec pg-0 -- psql -U postgres \
  -c "CREATE DATABASE myproject" \
  -c "\c myproject" \
  -c "CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS unaccent; CREATE EXTENSION IF NOT EXISTS vector;"
```

In the project form, use host `pg.customer-db.svc.cluster.local`, port `5432`, database
`myproject`, role `postgres` (fine for a laptop; use a dedicated role elsewhere), and the
password you chose. Then run the four connection commands with `microk8s kubectl`.

## Checklist

- [ ] Kubernetes 1.29+, default StorageClass, enough memory
- [ ] Outbound internet from the nodes (including port 7844)
- [ ] `kubectl` with cluster-admin
- [ ] Postgres 12+, a database owned by a role, TLS
- [ ] `pg_trgm`, `unaccent`, `vector` created
- [ ] You know the host, port, database, role, password

Then create the project and choose your options:
[Bring Your Own Cluster](/start/byo-cluster/) · [Bring Your Own Postgres](/start/byo-postgres/).
