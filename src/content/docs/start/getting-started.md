---
title: Getting Started
description: From a new project to a release on production, with the same steps as the developer test.
---

:::note
This page is a work in progress — the outline below will be filled in with full
steps and screenshots.
:::

## 1. Create a project

From the Projects page, create a project and wait until it is ready.

## 2. Connect GitHub

Create a repository from the `odoo-template`, then connect it to the project.

## 3. Develop locally

Run the stack locally with Docker Compose.

## 4. Push to dev

Pushing to `dev` runs the CI/CD workflow, which deploys to the project's pinned database.

## 5. Merge to main

Merging `dev` into `main` releases the same code to production.

## 6. Watch the logs and upgrade states

Check the logs and the upgrade state in the portal, then verify the live site.
