// Opens a plain Chrome window (own profile, no automation flags) so a person signs
// in to GitHub and the portal once; Google refuses to sign in to an automated one.
// The saved session is read over the debugging port only after both are signed in.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUTH = path.join(HERE, ".auth/session.json");
const PROFILE = path.join(HERE, ".auth/chrome-profile");
const PORT = 9333;
const PORTAL = "https://odoo.ordomatics.com";

const chrome = spawn("google-chrome", [
    `--user-data-dir=${PROFILE}`, `--remote-debugging-port=${PORT}`, "--no-first-run",
    "--no-default-browser-check", "https://github.com/login",
    `${PORTAL}/web/login?redirect=/my/projects`,
], { stdio: "ignore", detached: true });
chrome.unref();

const read = async () => {
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
    try {
        const context = browser.contexts()[0];
        const cookies = await context.cookies();
        const gh = cookies.some(c => c.domain.endsWith("github.com") && c.name === "logged_in" && c.value === "yes");
        const po = context.pages().some(p => {
            try {
                const u = new URL(p.url());
                return u.origin === PORTAL && /^\/my(\/|$)/.test(u.pathname);
            } catch {
                return false;
            }
        });
        if (gh && po) {
            await context.storageState({ path: AUTH });
            fs.chmodSync(AUTH, 0o600);
        }
        return { gh, po };
    } finally {
        await browser.close();      // detaches; the window stays open
    }
};

const deadline = Date.now() + 30 * 60 * 1000;
let last = "";
while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, 5000));
    const state = await read().catch(() => null);
    if (!state) {
        continue;
    }
    const now = `github=${state.gh} portal=${state.po}`;
    if (now !== last) {
        console.log(now);
        last = now;
    }
    if (state.gh && state.po) {
        console.log("saved session");
        break;
    }
}
