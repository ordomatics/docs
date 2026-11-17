// Scene 4: paste the token in the portal; the cluster becomes Connected.
import { AUTH, CLUSTER, PORTAL, handoff } from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, click, highlight, pause, startClip } from "../getting-started/tuto.mjs";

const token = handoff.read("token.txt");
const { page, finish } = await startClip("4-token", { storageState: AUTH, voiceOver: { say: SAY } });

await page.goto(`${PORTAL}/my/infrastructure`);
await click(page, page.getByRole("link", { name: new RegExp(CLUSTER) }).first(), { after: 1000 });
const field = page.locator("input[name=token]").first();
await field.waitFor();
await caption(page, "Paste the token");
await click(page, field, { after: 300 });
await field.fill(token);                  // masked field: the token itself never shows
await pause(page, 1500);
await click(page, page.getByRole("button", { name: "Connect", exact: true }).first(), { after: 1500 });

const badge = page.locator(".badge", { hasText: "Connected" }).first();
await badge.waitFor({ timeout: 10 * 60 * 1000 });
await caption(page, "Connected");
await highlight(page, badge);
await pause(page, 4500);
await highlight(page, null);
await caption(page, null, 400);
await finish();
