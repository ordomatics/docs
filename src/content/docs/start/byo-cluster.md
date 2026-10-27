---
title: Bring Your Own Cluster
description: Run your project on a Kubernetes cluster you operate, even with no public address.
---

Your Odoo runs on your own Kubernetes cluster: a data center, an office, another cloud, a
laptop. Ordomatics deploys and updates it, and your cluster needs **no public address and
no open port**.

Do [Prepare your server](/start/prepare-your-server/) first: it lists what the cluster
needs (Kubernetes 1.29 or newer, cluster-admin for the one-time connection, a default
StorageClass, enough memory) and gives commands to check it.

## How it is reached

A small connector (`cloudflared`, two replicas) runs on your cluster and dials **out** to
Cloudflare. We reach your cluster's API, and visitors reach your site, through that
tunnel. Your site is served at `<project>.ordomatics.com`: one label, so the name works
through the tunnel.

On the cluster we install an ingress controller (`ingress-nginx`) and run each
environment in its own namespace.

## Two ways to use it

**From the start.** On the *Create project* form, open **Servers** and choose **Your
Kubernetes cluster**, then give the cluster a name. The database can be ours or
[yours](/start/byo-postgres/). Setup runs until it needs your cluster, then stops on
**Setup is waiting for you**, with the commands to run.

**Later.** In **Your own clusters** on the project page, press **Connect a cluster**. When
adding an environment under **On your own database server**, choose **Runs on: your
cluster** (an environment on your cluster uses a database of yours).

## Connecting it

The page shows four commands with your tunnel key filled in. Run them against your
cluster, in order:

1. Create the `ordomatics-system` namespace.
2. Create the `cloudflared` secret with the **tunnel key**. It stays on your cluster.
3. Apply the connector manifest.
4. Print the **cluster token**.

Paste the token from step 4 into the page and press **Connect**. The cluster is shown as
**Waiting for you** until then. Once connected, the page lists its Kubernetes version and
the environments that run on it, and setup continues by itself.

:::caution
Check `kubectl config current-context` first: the commands go to whichever cluster is
current. Paste only the token from step 4 into the portal, not the key from step 2.
:::

### When it does not connect

| The page says | Meaning | Do |
|---|---|---|
| Your cluster's connector is not running, or cannot reach us | The connector can't reach Cloudflare | Check the nodes have outbound internet (port 7844), run the commands again, press **Connect** |
| Your cluster refused the token | The wrong token was pasted | Paste the step 4 token, not the step 2 key |
| We could not reach your cluster | It is off or unreachable | Check it is on, run the commands again, press **Try again** |

## What the platform needs from it

It checks Kubernetes 1.29 or newer, and that the token can create namespaces, cluster
roles and custom resource definitions. If not, it says what is missing. Applying the
connection manifest again grants it.

On your cluster the platform keeps **your** data only. Our shared service keys (WhatsApp,
SMS and telephony, AI providers) are not copied onto it; set your own for those features.
The service account we use is cluster-admin: use a dedicated cluster, or accept that
Ordomatics operates this one.

## Disconnecting

Remove the environments that run on the cluster first: it can't be disconnected while one
is still using it. Disconnecting then removes the ingress add-on, the connector and the
roles we created. Verify that nothing is left:

```bash
kubectl get ns ordomatics-system
kubectl get clusterrolebinding ordomatics
```

## We ran this

We tested it on a laptop with microk8s, first as an extra environment of a project, then
as a whole new project on its own cluster and database, reached at its
`<project>.ordomatics.com` address through the tunnel. Two lessons: page loads were slow
at first because of DNS lookups inside the cluster (fixed for customer clusters), and
the token from step 4 and the key from step 2 are easy to mix up.
[Prepare your server](/start/prepare-your-server/#try-it-on-a-laptop) has the steps.
