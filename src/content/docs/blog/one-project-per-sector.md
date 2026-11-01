---
title: "One project per sector: build an Odoo app once, deploy it to every client"
date: 2026-11-01
excerpt: Treat a project as an app and each database under it as a client. Build for a sector once, then add clients at 25€ each.
authors:
  - name: Moctar Diallo
    title: Founder, Ordomatics
---

If you build Odoo for a living, you probably notice that your clients in one line of
business want much the same thing. Two pharmacies need the same stock rules and the same
reports. Ten fast-food restaurants want the same till and the same menu structure. The
differences are a logo, a few prices and a list of users.

The way you pay for hosting should follow that shape. On Ordomatics it does.

## A project is an app, a database is a client

A **project** is your app: a repository with your modules, a Dockerfile, a test
environment and a live site. Every **database** under it is a client you deploy that app
to, with its own data and its own address.

That suggests how to organise the work: **one project per sector.**

- `pharma`: the modules and settings every pharmacy and clinic needs
- `resto`: the till, the menu and the kitchen flow for restaurants
- `alimentation`: stock and suppliers for food shops

Each project is built once. Each client is a new database under the right project.

## What it costs

A Developer project is **49€ a month** and includes its first database. Each additional
database, meaning each new client in that sector, is **25€**.

So the first pharmacy carries the cost of building the app. The second, third and
twentieth pharmacy cost 25€ each, and you do not repeat any of the setup.

## What adding a client involves

You open the project's production environment in the portal, type the client's name and a
contact email, and press **Onboard**. About four minutes later the client has:

- their own database, with the same modules your project runs
- their own address, for example `baobab.pharma.ordomatics.com`
- their own users and data, separate from every other client's

You hand over the address and they sign in. You can **pause** a client without touching
their data, and **offboard** one when they leave. The step-by-step version is in
[Onboard a client](/start/onboard-a-client/).

## One release reaches every client

This is where the model pays off. When you improve a module, you push it once. The
change goes through your test environment and, when you release, reaches the clients
under the project, because they all run the same image built from your repository.
Auto-upgrade is on by default for each client, and you can turn it off for one that is
not ready to move.

You fix a bug in the pharmacy app once, not twenty times.

## Where it stops

Be clear about the limits before you plan around this:

- **Clients under one project share its servers.** Each one you add uses some of the
  project's memory, so size the project to the number of clients you expect.
- **The first client you add restarts your project's servers once**, so choose a quiet
  moment. Later clients only restart the background jobs.
- **A client is a database, not a copy of the code.** If one client needs different
  modules from the rest, that is the sign they belong in another project.
- **One project is one sector.** If you serve several sectors, you need a project each.
  The Partner plan, at 395€ a month, covers unlimited projects, with a dedicated
  cluster.

## Where to start

Create the project for your first sector with the
[Getting Started guide](/start/getting-started/), then add your first client with
[Onboard a client](/start/onboard-a-client/). If you want to see the other half of the
idea, read [Your Odoo environment is code](/blog/your-environment-is-code/).
