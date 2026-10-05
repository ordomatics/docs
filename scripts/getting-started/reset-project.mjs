// Off camera: deletes the tutorial's project through the portal's own Delete control.
import { chromium } from "playwright";
import { AUTH, PORTAL, PROJECT } from "./common.mjs";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: AUTH })).newPage();
await page.goto(`${PORTAL}/my/projects`);
const link = page.getByRole("link", { name: PROJECT, exact: true }).first();
if (!(await link.count())) {
    console.log("no project to delete");
    await browser.close();
    process.exit(0);
}
await link.click();
await page.locator("summary", { hasText: "Delete project" }).click();
const confirm = page.locator("details", { hasText: "Delete project" }).locator("input[type=text]");
await confirm.fill(PROJECT);
await page.locator("details", { hasText: "Delete project" }).getByRole("button", { name: "Delete" }).click();
await page.getByText(/Deleting .* and everything it runs on/).waitFor({ timeout: 30000 });
console.log("deletion started:", page.url());
await browser.close();
