// GitHub's "sudo mode": sensitive actions (installing an app) need a recent
// confirmation by email. A person does that here, in a plain Chrome window, on
// a page that demands it; the window's cookies then replace the recorder's.
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { AUTH, HERE } from "./common.mjs";

const PORT = 9333;
const GATED = "https://github.com/settings/tokens/new";      // creating a token needs sudo mode
const attach = () => chromium.connectOverCDP(`http://127.0.0.1:${PORT}`).catch(() => null);

let browser = await attach();
if (!browser) {
    const chrome = spawn("google-chrome", [`--user-data-dir=${path.join(HERE, ".auth/chrome-profile")}`,
        `--remote-debugging-port=${PORT}`, "--no-first-run", "--no-default-browser-check", "about:blank"],
    { stdio: "ignore", detached: true });
    chrome.unref();
    for (let i = 0; i < 15 && !browser; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        browser = await attach();
    }
}
const context = browser.contexts()[0];
const page = await context.newPage();
await page.goto(GATED);
await page.bringToFront();
let asked = false;
const deadline = Date.now() + 30 * 60 * 1000;
let last = "";
while (Date.now() < deadline) {
    const title = await page.title().catch(() => "(closed)");
    const prompting = /Confirm access/i.test(title) || (await page.getByText("Confirm access").count().catch(() => 0)) > 0;
    asked ||= prompting;
    const now = `${title}${prompting ? " [asking to confirm]" : ""}`;
    if (now !== last) {
        console.log("page:", now);
        last = now;
    }
    if (!prompting && /github\.com\/settings\/tokens\/new/.test(page.url()) && /token/i.test(title)) {
        const state = JSON.parse(fs.readFileSync(AUTH, "utf8"));
        const fresh = await context.cookies();
        state.cookies = [...state.cookies.filter((c) => !c.domain.endsWith("github.com")),
            ...fresh.filter((c) => c.domain.endsWith("github.com"))];
        fs.writeFileSync(AUTH, JSON.stringify(state));
        console.log(asked ? "confirmed by the person: recorder session updated" : "no confirmation was asked: recorder session updated");
        await page.goto("https://github.com/settings/profile");      // off the token form: nothing is created
        break;
    }
    await new Promise((r) => setTimeout(r, 3000));
}
await browser.close();
