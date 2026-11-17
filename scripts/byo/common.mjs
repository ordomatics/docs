// Shared setup for the "Bring your own cluster" demo: the Getting Started helpers,
// this demo's output folders, and the few values handed from one scene to the next.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DOCS, HERE as GS, voiceLine } from "../getting-started/common.mjs";
import { configure, startClip } from "../getting-started/tuto.mjs";

export * from "../getting-started/common.mjs";
export const BYO = path.dirname(new URL(import.meta.url).pathname);
export const STATE = path.join(BYO, ".auth");
export const WORK = path.join(STATE, "work");
export const CLUSTER = process.env.TUTO_CLUSTER || "work";
export const ENVIRONMENT = process.env.TUTO_ENVIRONMENT || "demo";
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

// TUTO_DRY=1 runs a scene for real but records nothing and says nothing: a rehearsal.
export const DRY = process.env.TUTO_DRY === "1";
export const scene = (name, options = {}) =>
    startClip(DRY ? null : name, DRY ? { ...options, voiceOver: undefined } : options);

// Every kubectl in a scene, on camera or off, must reach the demo's minikube and nothing else.
// An inherited KUBECONFIG once pointed a recording at the platform cluster.
delete process.env.KUBECONFIG;
export function requireMinikube() {
    const context = execFileSync("kubectl", ["config", "current-context"], { encoding: "utf8", env: process.env }).trim();
    if (context !== "minikube") {
        throw new Error(`kubectl points at "${context}", not minikube: refusing to run`);
    }
}
