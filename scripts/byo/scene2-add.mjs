// Scene 2: connect a cluster from the project page; its card shows the connect command.
import { AUTH, CLUSTER, PORTAL, PROJECT, handoff, scene } from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, click, highlight, pause, startClip, type } from "../getting-started/tuto.mjs";

const deadline = Date.now() + 15 * 60 * 1000;

const { page, finish, fastForward } = await scene("2-add", { storageState: AUTH, voiceOver: { say: SAY } });

await page.goto(`${PORTAL}/my/projects`);
await page.getByRole("link", { name: PROJECT, exact: true }).first().waitFor();
await pause(page, 800);
await caption(page, "Open your project");
await click(page, page.getByRole("link", { name: PROJECT, exact: true }).first(), { after: 1200 });

// The project's own-clusters card: one name, one button.
const form = page.locator("form[action$='/clusters/new']");
await form.scrollIntoViewIfNeeded();
await pause(page, 1200);
await caption(page, "Add the cluster");
await type(page, form.locator("input[name=name]"), CLUSTER, { delay: 90 });
await click(page, form.getByRole("button", { name: "Connect a cluster" }), { after: 1500 });

// The platform builds the tunnel first ("Preparing…"); the command shows once it is ready.
const source = page.locator(".js_copy_source").first();
fastForward(20);
while (!(await source.isVisible().catch(() => false))) {
    if (Date.now() > deadline) {
        throw new Error("the cluster never showed its connect command");
    }
    await pause(page, 8000);
    await page.reload();
}
fastForward();
await highlight(page, source);
await pause(page, 3500);
await highlight(page, null);
// Handed to the next scene, which types it. It holds the tunnel key, which dies with the cluster.
handoff.write("connect.txt", await source.innerText());
await caption(page, null, 400);
await finish();
