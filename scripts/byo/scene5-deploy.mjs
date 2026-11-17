// Scene 5: add an environment on the cluster, on a Postgres running beside it, and open it.
// Needs TUTO_PG_PASSWORD: the demo Postgres' password, which the recording types in the portal.
import { AUTH, CLUSTER, DB, ENVIRONMENT, PG_HOST, PORTAL, PROJECT, requireMinikube, scene, sh, until } from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, click, highlight, pause, startClip, type } from "../getting-started/tuto.mjs";

requireMinikube();
const password = process.env.TUTO_PG_PASSWORD;
if (!password) {
    throw new Error("Set TUTO_PG_PASSWORD (any password: it protects a throwaway Postgres on the demo cluster)");
}

if (!/^[A-Za-z0-9_-]{8,}$/.test(password)) {
    throw new Error("TUTO_PG_PASSWORD: 8 or more letters, digits, - or _");
}

// Off camera: the database the environment will run on, as the Prepare your server page describes.
sh(`PG=${password}
kubectl create namespace customer-db --dry-run=client -o yaml | kubectl apply -f -
kubectl -n customer-db create secret generic pg --from-literal=password="$PG" --dry-run=client -o yaml | kubectl apply -f -
kubectl -n customer-db apply -f - <<'YAML'
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
          args: ["-c", "ssl=on", "-c", "ssl_cert_file=/etc/ssl/certs/ssl-cert-snakeoil.pem", "-c", "ssl_key_file=/etc/ssl/private/ssl-cert-snakeoil.key"]
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
YAML
kubectl -n customer-db rollout status statefulset/pg --timeout=300s`, { cwd: "/tmp" });
await until(() => sh(`kubectl -n customer-db exec pg-0 -- pg_isready -U postgres`, { cwd: "/tmp", allowFail: true }).includes("accepting"),
    { timeout: 180000, every: 3000, what: "Postgres" });
// Odoo refuses to run as the postgres user: a role of its own owns the database.
const psql = (sql, db = "postgres", allowFail = false) =>
    sh(`kubectl -n customer-db exec pg-0 -- psql -U postgres -d ${db} -c "${sql}"`, { cwd: "/tmp", allowFail });
psql(`CREATE ROLE odoo LOGIN PASSWORD '${password}'`, "postgres", true);
psql(`ALTER ROLE odoo PASSWORD '${password}'`);
psql(`DROP DATABASE IF EXISTS ${DB} WITH (FORCE)`);       // an empty database: the upgrade seeds it on camera
psql(`CREATE DATABASE ${DB} OWNER odoo`);
psql(`ALTER DATABASE ${DB} OWNER TO odoo`);
psql("CREATE EXTENSION IF NOT EXISTS pg_trgm; CREATE EXTENSION IF NOT EXISTS unaccent; CREATE EXTENSION IF NOT EXISTS vector;", DB);

const { page, finish, fastForward } = await scene("5-deploy", { storageState: AUTH, voiceOver: { say: SAY } });
const deadline = Date.now() + 30 * 60 * 1000;

await page.goto(`${PORTAL}/my/projects`);
await page.getByRole("link", { name: PROJECT, exact: true }).first().waitFor();
await pause(page, 800);
await caption(page, "Add an environment on your cluster");
await click(page, page.getByRole("link", { name: PROJECT, exact: true }).first(), { after: 1200 });
// The project page reloads itself once when something it was busy with finishes: wait it out,
// so the section opened below is not closed again halfway through.
fastForward(6);
for (let stable = false; !stable;) {
    try {
        await page.waitForLoadState("load");
        const before = await page.evaluate(() => performance.timeOrigin);
        await pause(page, 9000);
        stable = before === await page.evaluate(() => performance.timeOrigin);
    } catch {
        // navigating: the page is not settled yet
    }
}
fastForward();
const summary = page.locator("summary", { hasText: "On your own database server" });
await summary.waitFor();
await click(page, summary, { after: 1000 });

const form = page.locator("form[action$='/environments/new-external']");
await type(page, form.locator("[name=name]"), ENVIRONMENT, { delay: 80 });
await caption(page, "Choose your cluster and your database");
await form.locator("[name=cluster_id]").selectOption({ label: `your cluster ${CLUSTER}` });
await pause(page, 1200);
await type(page, form.locator("[name=host]"), PG_HOST, { delay: 35 });
await form.locator("[name=port]").fill("5432");
await form.locator("[name=sslmode]").selectOption("require");
await type(page, form.locator("[name=database]"), DB, { delay: 80 });
await type(page, form.locator("[name=user]"), "odoo", { delay: 80 });
await type(page, form.locator("[name=password]"), password, { delay: 60 });
await pause(page, 1200);
await click(page, form.getByRole("button", { name: "Connect and create" }), { after: 2000 });

await caption(page, "The platform deploys it");
const row = page.locator(".o_saas_environment_card", { hasText: `ged-${ENVIRONMENT}.ordomatics.com` }).first();
await row.waitFor({ timeout: 120000 });
fastForward(30);
for (;;) {
    if (/Running/.test(await row.innerText().catch(() => ""))) {
        break;
    }
    if (Date.now() > deadline) {
        throw new Error("the environment never became Ready");
    }
    await pause(page, 10000);
    await page.reload();
}
fastForward();
await pause(page, 1500);

const link = row.locator("a[href^='https://']").first();
const url = await link.getAttribute("href");
await caption(page, "Your Odoo, on your cluster");
await highlight(page, link);
await pause(page, 2500);
await highlight(page, null);
await until(() => fetch(url).then((r) => r.status === 200).catch(() => false),
    { timeout: 10 * 60 * 1000, every: 10000, what: url });
await page.goto(`${url}/web/login`);
await page.locator("input[name=login]").waitFor();
await pause(page, 4500);
await caption(page, null, 400);
console.log(`ended on ${page.url()}`);
await finish();
