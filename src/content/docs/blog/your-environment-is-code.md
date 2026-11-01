---
title: "Your Odoo environment is code: what works on your laptop runs in production"
date: 2026-11-01
excerpt: A server you configured by hand cannot be reviewed, repeated or rolled back. A Dockerfile can.
authors:
  - name: Moctar Diallo
    title: Founder, Ordomatics
---

Every Odoo project eventually needs something Odoo itself does not ship: a system
library for OCR, fonts for PDF reports, a command-line tool an integration shells out
to, a Python package that needs a compiler. Where that lives, and how it gets there, is
the part of hosting that decides whether your next upgrade is calm or stressful.

On a server you log into, the usual answer is a terminal session: `apt install`, edit a
config file, restart. It works. But a week later nobody can say exactly what is
installed, the test server is slightly different from the live one, and rebuilding the
machine from memory is a project in itself.

On Ordomatics, that answer is a file in your repository.

## The Dockerfile is yours

Each project's repository contains a `Dockerfile`. It starts from our Odoo base image
and adds what your project needs. Here is a real one, from a project that scans
administrative forms:

```dockerfile
FROM ordomatics/odoo:${PLATFORM_TAG}

USER root

RUN apt-get update && apt-get install -y --no-install-recommends \
      tesseract-ocr tesseract-ocr-fra fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

COPY ./requirements.txt /tmp/client-requirements.txt
RUN pip3 install -r /tmp/client-requirements.txt

COPY ./addons /mnt/extra-addons
COPY ./modules.cfg /tmp/modules.cfg
```

Four things are in that file that no Odoo setting can give you: an OCR engine with
French language data, system fonts for PDF rendering, extra Python packages, and your
own modules. They are all declared in one place, in a file you can read and change.

## What works on your laptop runs in production

The same image is built three times along the way, and it is the same file each time:

```bash
docker compose up --build -d     # on your laptop
git push origin dev              # your test environment builds and runs it
git merge --ff-only dev          # your live site runs the same image
git push
```

There is no step where someone logs into a server and installs the thing that was
missing. If it works on your laptop, the dependency is in the Dockerfile, and so it is
in the test environment and in production. If it does not work, you find out on your
laptop, where it is cheap.

## Why this matters

- **It is reviewable.** A change to the environment is a change to a file. It shows up
  in a diff, a teammate can read it, and the history says who changed what and when.
- **It is repeatable.** Test and production are built from the same instructions, so
  they cannot quietly drift apart. A new environment is a build, not a weekend.
- **It is reversible.** A bad release is undone by going back to the previous commit.
  There is no half-modified server to repair, because nothing on the server was
  modified by hand.
- **It leaves nothing to remember.** Rebuilding from scratch is the normal path, not
  the emergency one.

## What it does not do

It is fair to say what you give up. A change to the system now means a rebuild and a
redeploy, which is slower than typing a command on a live machine.

On the shared platform you work through the logs and the portal, not a shell on the
server. On a dedicated cluster, yours or one we run for you, you do have access to the
pods and can change a running one by hand. We do not recommend it. A change made inside
a pod is lost at the next deploy and appears in no history, so nobody can review it or
repeat it. Keep code and environment configuration in git: it is also the safer way to
work, because every change is visible, attributable and reversible.

## Where to start

The [Getting Started guide](/start/getting-started/) walks through the whole loop on a
real project: create it, run it locally, push to `dev`, release to production. If you
would rather keep your data or your servers on your side, see
[prepare your server](/start/prepare-your-server/).
