// Off camera, once: answers VS Code's "trust this folder" question and saves the
// browser state (cookies plus VS Code's own storage) the recorder starts from.
import { chromium } from "playwright";
import { AUTH, VSCODE_URL, WORKDIR, startVscode } from "./common.mjs";

await startVscode();
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, storageState: AUTH });
const page = await context.newPage();
await page.goto(`${VSCODE_URL}/?folder=${encodeURIComponent(WORKDIR)}`);
await page.waitForSelector(".monaco-workbench", { timeout: 90000 });
await page.waitForTimeout(3000);
await page.keyboard.press("Control+Backquote");
await page.waitForTimeout(4000);
const trust = page.locator(".monaco-dialog-box .monaco-button", { hasText: "Trust Folder & Continue" });
if (await trust.count()) {
    await trust.click();
    await page.waitForTimeout(3000);
    console.log("trusted the folder");
} else {
    console.log("no trust question");
}
// The Chat side panel is open by default; closed here, it stays closed.
if (await page.locator(".part.auxiliarybar").isVisible().catch(() => false)) {
    await page.keyboard.press("Control+Alt+B");
    await page.waitForTimeout(1500);
    console.log("closed the side panel:", !(await page.locator(".part.auxiliarybar").isVisible().catch(() => false)));
}
await page.keyboard.press("Control+Backquote");      // leave the terminal closed too
await page.waitForTimeout(2500);
await context.storageState({ path: AUTH, indexedDB: true });
await browser.close();
