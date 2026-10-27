---
title: Bring Your Own Cluster
description: Step by step, run your project on a Kubernetes cluster you operate, even with no public address.
---

Your Odoo runs on your own Kubernetes cluster: a data center, an office, another cloud, a
laptop. Ordomatics deploys and updates it, and your cluster needs **no public address and
no open port**. This page goes from a cluster to a running site.

A small connector (`cloudflared`, two replicas) runs on your cluster and dials **out** to
Cloudflare. We reach your cluster's API, and visitors reach your site, through that tunnel.
On the cluster we install an ingress controller (`ingress-nginx`) and run each environment
in its own namespace.

## 1. Prepare the cluster

Requirements, in short: Kubernetes 1.29 or newer, `kubectl` with cluster-admin, outbound
internet from the nodes (including port 7844 for Cloudflare), a default StorageClass,
about 8 GB of memory, and no other ingress controller. The full list is in
[Prepare your server](/start/prepare-your-server/#your-kubernetes-cluster).

Check:

```bash
kubectl config current-context                   # is this the cluster you mean to connect?
kubectl version                                  # Server: v1.29 or newer
kubectl get storageclass                         # one marked "(default)"
kubectl auth can-i '*' '*' --all-namespaces      # yes
kubectl get ingressclass                         # nothing else claiming ingress
```

On MicroK8s, write `microk8s kubectl` for every `kubectl` in this page, and
`microk8s enable dns hostpath-storage` first (not `ingress`).

## 2. Create the project on your cluster

1. In the [portal](https://odoo.ordomatics.com), open **Projects** and click **Create a project**.
2. Give it a **name** and an **address**. The address is permanent.
3. Open **Servers** and choose **Your Kubernetes cluster**.
4. Type a **cluster name**, for example `onprem`.
5. Leave **Database** as ours, or choose **Yours** (see [Bring Your Own Postgres](/start/byo-postgres/)).
6. Click **Create project**.

Setup runs until it needs your cluster, then stops with the notice **Setup is waiting for
you**. Nothing is wrong; it needs steps 3 and 4 below. While it waits, the step list shows
**Preparing the connection to your cluster**, and later **Waiting for your cluster to
answer…** until it connects.

## 3. Run the four commands

On the project page, the **Your own clusters** card shows your cluster as **Waiting for
you**, with four commands and your tunnel key already filled in. Each has a **Copy**
button, and **Copy all four** copies the lot. Run them, in order, on your cluster:

| # | What it does | Command |
|---|---|---|
| 1 | Creates the namespace for our connector | `kubectl create namespace ordomatics-system` |
| 2 | Stores the **tunnel key**; it stays on your cluster | `kubectl -n ordomatics-system create secret generic cloudflared --from-literal=token=<tunnel key>` |
| 3 | Installs the connector and the account we use | `kubectl apply -f https://odoo.ordomatics.com/saas_portal/static/k8s/ordomatics-bootstrap.yaml` |
| 4 | Prints the **cluster token** | `kubectl -n ordomatics-system get secret ordomatics-token -o jsonpath='{.data.token}' \| base64 -d` |

:::caution
`kubectl` acts on your *current* context. Check `kubectl config current-context` before
step 2, or the key lands on whichever cluster is the default. And keep the two secrets
apart: the key from step 2 stays on your cluster; only the token printed by step 4 goes to
the portal.
:::

Check that the connector runs (both pods `Running`):

```bash
kubectl -n ordomatics-system get pods
```

## 4. Connect the cluster

Under the commands, paste the token that step 4 printed into the **token** box and click
**Connect**. The cluster's badge moves from **Waiting for you** to **Connected**, with its
Kubernetes version. The check refuses a cluster older than 1.29, or a token that can't
create namespaces, cluster roles and custom resource definitions, and says which. Applying
step 3 again grants the latter.

Setup then continues by itself: it installs the ingress controller, builds the namespace
and starts your Odoo. When the page says **Ready**, open
`https://<address>.ordomatics.com`. Check on the cluster:

```bash
kubectl get pods -A | grep -v kube-system
```

You should see the connector in `ordomatics-system`, `ingress-nginx` pods, and your
project's pods (server, worker, longpolling, Redis) in a namespace of their own.

Then continue with [Getting started](/start/getting-started/#2-create-your-repository)
from step 2: create your repository, connect GitHub and ship your module.

### If it doesn't connect

| The page says | Meaning | Do |
|---|---|---|
| Your cluster's connector is not running, or cannot reach us | The connector can't reach Cloudflare | `kubectl -n ordomatics-system logs deploy/cloudflared`; open outbound port 7844; click **Connect** again |
| Your cluster refused the token | You pasted the wrong one | Run step 4 again and paste its output, not the key from step 2 |
| We could not reach your cluster | The cluster is off or the connection dropped | Check it's on, run the commands again, click **Try again** |
| Badge **We hit a problem** | A step failed | Read the message under the badge, fix it, click **Try again** |
| Pods stay `Pending` | Not enough memory or no default StorageClass | `kubectl describe pod <pod>`; add capacity or a StorageClass |

## 5. Add a cluster to an existing project

1. Open the project in the portal. In **Your own clusters**, type a name (for example
   `onprem`) and click **Connect a cluster**.
2. Run the four commands and paste the token, as in steps 3 and 4.
3. Open **On your own database server** and fill in the database details (see
   [Bring Your Own Postgres](/start/byo-postgres/#4-add-your-database-to-a-project-that-already-exists)).
4. Under **Runs on**, choose **your cluster onprem**, then click **Connect and create**.

Environments there are served at `https://<project>-<environment name>.ordomatics.com`.
An environment on your cluster uses a database of yours.

## What the platform needs and keeps

- The service account we use is **cluster-admin**: use a dedicated cluster, or accept that
  Ordomatics operates this one.
- Our shared service keys (WhatsApp, SMS and telephony, AI providers) are **never copied**
  onto your cluster. Set your own for those features.
- Files go to a storage bucket that only your project can open.
- Updates come through your repository as usual: push to `dev`, release to `main`.

## Day to day

- **Laptop or office cluster:** the site is only up while the machine is on and connected.
- **Restarts:** the connector and Odoo restart on their own; nothing to re-run.
- **Slow first page loads?** Customer clusters are set up to avoid a known DNS slowness;
  if you see 5-second lookups, tell us.

## Disconnecting

A cluster can't be disconnected while an environment runs on it. Delete those environments
first (or **Delete project**). Then, in **Your own clusters**, click **Disconnect**: the
badge shows **Disconnecting**, and we remove the ingress add-on, the connector and the
roles we created. Verify that nothing is left:

```bash
kubectl get ns ordomatics-system
kubectl get clusterrolebinding ordomatics
```

Both should say *not found*. If not, delete them by hand:
`kubectl delete ns ordomatics-system` and `kubectl delete clusterrolebinding ordomatics`.

## We ran this

We tested it on a laptop with microk8s, first as an extra environment of a project, then as a
whole new project on its own cluster and database, reached at its `ordomatics.com` address
through the tunnel. The laptop recipe is in
[Prepare your server](/start/prepare-your-server/#try-it-on-a-laptop).
