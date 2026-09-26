---
title: Development Workflow
description: From a GitHub repo to a live, CI/CD-deployed instance.
---

:::note
This page is a work in progress — the outline below will be filled in with full
steps and screenshots.
:::

## 1. Create your repository

Create a GitHub repository from the `odoo-template`.

## 2. Connect GitHub

Connecting the repository points it at a **pinned database** — `demo` — which is
the database the upgrade job targets on every push.

## 3. Develop locally

Run the stack locally with Docker Compose.

## 4. Ship through CI/CD

Pushing runs the CI/CD workflow, which deploys to the pinned database (`demo`).

## 5. Point at staging

Change the pinned database to `demo-staging`: the upgrade job now targets
`demo-staging` instead, with no other change to the workflow.
