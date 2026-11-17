// Shared setup for the "Bring your own cluster" demo: the Getting Started helpers,
// this demo's output folders, and the few values handed from one scene to the next.
import fs from "node:fs";
import path from "node:path";
import { DOCS, HERE as GS, voiceLine } from "../getting-started/common.mjs";
import { configure } from "../getting-started/tuto.mjs";

export * from "../getting-started/common.mjs";
export const BYO = path.dirname(new URL(import.meta.url).pathname);
export const STATE = path.join(BYO, ".auth");
export const WORK = path.join(STATE, "work");
export const CLUSTER = process.env.TUTO_CLUSTER || "demo";
export const ENVIRONMENT = process.env.TUTO_ENVIRONMENT || "onprem";
export const DB = "demo";
export const PG_HOST = "pg.customer-db.svc.cluster.local";

configure({
    videoDir: path.join(DOCS, "public/byo-cluster"),
    imageDir: path.join(DOCS, "src/assets/byo-cluster"),
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    voice: voiceLine,
});

fs.mkdirSync(WORK, { recursive: true });
export const handoff = {
    write: (name, text) => fs.writeFileSync(path.join(STATE, name), text, { mode: 0o600 }),
    read: (name) => fs.readFileSync(path.join(STATE, name), "utf8").trim(),
};
export { GS };
