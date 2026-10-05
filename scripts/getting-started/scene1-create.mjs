// Scene 1: create the project in the portal and wait until it is ready.
import { AUTH, PORTAL, PROJECT } from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, click, highlight, pause, startClip } from "./tuto.mjs";

const { page, finish, fastForward } = await startClip("1-create", { storageState: AUTH, voiceOver: { say: SAY } });

await page.goto(`${PORTAL}/my/projects`);
await page.getByRole("link", { name: "Create a project" }).waitFor();
await pause(page, 800);

await caption(page, "Create a project");
await click(page, page.getByRole("link", { name: "Create a project" }));
await page.getByRole("textbox", { name: "Project name" }).waitFor();

const name = page.getByRole("textbox", { name: "Project name" });
await click(page, name, { after: 150 });
await page.keyboard.press("Control+A");
await page.keyboard.type(PROJECT, { delay: 90 });
const address = page.getByRole("textbox", { name: "Address" });
await click(page, address, { after: 150 });
await page.keyboard.press("Control+A");
await page.keyboard.type(PROJECT, { delay: 90 });
await pause(page, 600);
await click(page, page.getByRole("button", { name: "Create project" }), { after: 1500 });

await page.waitForURL(/\/my\/projects\/\d+/, { timeout: 60000 });
await caption(page, "The platform builds it for you");
await pause(page, 4000);
await caption(page, null, 300);

// Minutes of provisioning: the page updates itself; play it fast.
fastForward(45);
await page.locator("span.badge", { hasText: /^\s*Ready\s*$/ }).waitFor({ timeout: 25 * 60 * 1000 });
fastForward();
await pause(page, 1200);

await caption(page, "Your project is ready");
await highlight(page, page.getByRole("link", { name: `https://${PROJECT}.ordomatics.com` }).first());
await pause(page, 3500);
await highlight(page, null);
await caption(page, null, 600);
console.log(`project page: ${page.url()}`);
await finish();
