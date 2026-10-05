// Off camera: uninstalls the Ordomatics app from the tutorial's GitHub account,
// so the video shows a first-time install.
import { chromium } from "playwright";
import { AUTH } from "./common.mjs";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, storageState: AUTH, bypassCSP: true });
const page = await context.newPage();
page.on("dialog", (d) => d.accept());
await page.goto("https://github.com/settings/installations");
await page.waitForTimeout(2000);
const hrefs = await page.locator("a[href*='/settings/installations/']").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
if (!hrefs.length) {
    console.log("no app installed");
} else {
    for (const href of hrefs) {
        await page.goto(`https://github.com${href}`);
        const title = await page.title();
        if (!/Ordomatics Platform CI/.test(title)) {
            console.log("left alone:", title);
            continue;
        }
        const id = href.split("/").pop();
        await page.getByRole("button", { name: "Uninstall", exact: true }).first().click();
        await page.waitForTimeout(3000);
        console.log("uninstalled installation", id);
    }
}
await context.storageState({ path: AUTH, indexedDB: true });
await browser.close();
