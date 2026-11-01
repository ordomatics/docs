---
title: "One application per sector: build your Odoo once, deploy it to every client"
date: 2026-11-01
excerpt: 49€ per application, then 25€ for each additional client. What an application is, and how many clients can share one.
authors:
  - name: Moctar Diallo
    title: Founder, Ordomatics
---

If you build Odoo for a living, you probably notice that your clients in one line of
business want much the same thing. Two pharmacies need the same stock rules and the same
reports. Ten fast-food restaurants want the same till and the same menu structure. The
differences are a logo, a few prices and a list of users.

The way you pay for hosting should follow that shape. On Ordomatics it does.

## What an application is

On Ordomatics, an **application** is what you build: a repository with your Odoo modules, a
Dockerfile, a test environment and a live site. In the portal it is a **project**. It is
built once and versioned in git, and it is the thing you improve over time.

A **client** is a business that uses your application: its own database, its own address,
its own users and its own data. The same application runs for every client, and no client
sees another's data.

That suggests how to organise the work: **one application per sector.**

- `pharma`: the modules and settings every pharmacy and clinic needs
- `resto`: the till, the menu and the kitchen flow for restaurants
- `alimentation`: stock and suppliers for food shops

## What it costs

**49€ a month per application**, which includes its first client. Then **25€ a month for
each additional client** of that application.

So the first pharmacy carries the cost of building the application. The second, third and
twentieth pharmacy cost 25€ each, and you do not repeat any of the setup.

**Users are not charged.** Each client's database can have as many users as it needs. The
one exception is Odoo Enterprise: if you bring in Enterprise modules, Odoo's own licence
for them applies, and that is between you and Odoo.

## What adding a client involves

You open the project's production environment in the portal, type the client's name and a
contact email, and press **Onboard**. About four minutes later the client has:

- their own database, with the same modules your application runs
- their own address, for example `baobab.pharma.ordomatics.com`
- their own users and data, separate from every other client's

You hand over the address and they sign in. You can **pause** a client without touching
their data, and **offboard** one when they leave. The step-by-step version is in
[Onboard a client](/start/onboard-a-client/).

## One release reaches every client

This is where the model pays off. When you improve a module, you push it once. The
change goes through your test environment and, when you release, reaches the clients
under the application, because they all run the same image built from your repository.
Auto-upgrade is on by default for each client, and you can turn it off for one that is
not ready to move.

You fix a bug in the pharmacy application once, not twenty times.

## How many clients can share an application

As many as you have. There is no limit on the number of clients per application, and the
price per client stays 25€ however many you add.

Clients share the application's servers, so what grows with them is the load, not a
count. A busy client uses more than a quiet one, and a larger set of clients needs larger
servers. You size the application for the load you expect and resize it as you grow.

## Where it stops

Be clear about the limits before you plan around this:

- **The first client you add restarts your application's servers once**, so choose a quiet
  moment. Later clients only restart the background jobs.
- **A client is a database, not a copy of the code.** If one client needs different
  modules from the rest, that is the sign they belong in another application.
- **One application is one sector.** If you serve several sectors, you need an application each.
  The Partner plan, at 395€ a month, covers unlimited applications on a dedicated
  cluster. You pay for the cluster itself.

## Where to start

Create the project for your first sector with the
[Getting Started guide](/start/getting-started/), then add your first client with
[Onboard a client](/start/onboard-a-client/). If you want to see the other half of the
idea, read [Your Odoo environment is code](/blog/your-environment-is-code/).
