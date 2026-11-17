// Scene 2: add the cluster on the account; its page shows the connect command.
import { AUTH, CLUSTER, PORTAL, handoff } from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, click, highlight, pause, startClip, type } from "../getting-started/tuto.mjs";

const { page, finish } = await startClip("2-add", { storageState: AUTH, voiceOver: { say: SAY } });

await page.goto(`${PORTAL}/my/infrastructure`);
await page.getByRole("link", { name: "+ Connect a cluster" }).waitFor();
await pause(page, 800);
await caption(page, "Your infrastructure");
await pause(page, 2500);

await caption(page, "Add the cluster");
await click(page, page.getByRole("link", { name: "+ Connect a cluster" }), { after: 1200 });
await type(page, page.locator("#cluster_name"), CLUSTER, { delay: 90 });
await click(page, page.getByRole("button", { name: "Connect a cluster" }), { after: 1500 });

const source = page.locator(".js_copy_source").first();
await source.waitFor({ timeout: 60000 });
await highlight(page, source);
await pause(page, 3500);
await highlight(page, null);
// Handed to the next scene, which types it. It holds the tunnel key, which dies with the cluster.
handoff.write("connect.txt", await source.innerText());
await caption(page, null, 400);
await finish();
