// Off camera: deletes the tutorial's GitHub repository through its settings page.
import { chromium } from "playwright";
import { AUTH, GITHUB_USER, PROJECT, hideGithubNotices } from "./common.mjs";

const REPO = `${GITHUB_USER}/${PROJECT}`;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, storageState: AUTH, bypassCSP: true });
const page = await context.newPage();
const response = await page.goto(`https://github.com/${REPO}/settings`);
if (response.status() === 404) {
    console.log("no repository to delete");
    await browser.close();
    process.exit(0);
}
await page.getByRole("button", { name: "Delete this repository" }).first().click();
for (const name of [/I want to delete this repository/, /I have read and understand these effects/]) {
    await page.getByRole("button", { name }).click();
    await page.waitForTimeout(800);
}
if (await page.locator("input[type=password]").count()) {
    await page.screenshot({ path: "/tmp/gh-delete-sudo.png" });
    console.log("GitHub asks for the password: stopping");
    await browser.close();
    process.exit(2);
}
await page.locator("#verification_field, input[name=verification_field]").first().fill(REPO);
await page.getByRole("button", { name: "Delete this repository" }).last().click();
await page.waitForTimeout(4000);
if (await page.locator("input[type=password]").count()) {
    await page.screenshot({ path: "/tmp/gh-delete-sudo.png" });
    console.log("GitHub asks for the password: stopping at", page.url());
    await browser.close();
    process.exit(2);
}
const check = await page.request.get(`https://github.com/${REPO}`);
console.log("after delete:", page.url(), "| repository page status:", check.status());
await context.storageState({ path: AUTH, indexedDB: true });
await browser.close();
