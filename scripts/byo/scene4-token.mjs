// Scene 4: paste the token in the project's cluster card; the cluster becomes Connected.
import { AUTH, PORTAL, PROJECT, handoff, scene } from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, click, highlight, pause, startClip } from "../getting-started/tuto.mjs";

const token = handoff.read("token.txt");
const { page, finish, fastForward } = await scene("4-token", { storageState: AUTH, voiceOver: { say: SAY } });

await page.goto(`${PORTAL}/my/projects`);
await click(page, page.getByRole("link", { name: PROJECT, exact: true }).first(), { after: 1000 });
const field = page.locator("input[name=token]").first();
await field.waitFor();
await caption(page, "Paste the token");
await click(page, field, { after: 300 });
await field.fill(token);                  // masked field: the token itself never shows
await pause(page, 1500);
await click(page, page.getByRole("button", { name: "Connect", exact: true }).first(), { after: 1500 });

// The platform checks the cluster for a few minutes; the page only shows the result on reload.
const badge = page.locator(".badge", { hasText: "Connected" }).first();
const deadline = Date.now() + 20 * 60 * 1000;
fastForward(20);
while (!(await badge.isVisible().catch(() => false))) {
    if (Date.now() > deadline) {
        throw new Error("the cluster never showed Connected");
    }
    await pause(page, 8000);
    await page.reload();
}
fastForward();
await caption(page, "Connected");
await highlight(page, badge);
await pause(page, 4500);
await highlight(page, null);
await caption(page, null, 400);
await finish();
