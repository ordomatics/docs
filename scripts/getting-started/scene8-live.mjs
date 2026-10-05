// Scene 8: the logs in the portal, then the module on the live site.
import { AUTH, PORTAL, PROJECT } from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, click, highlight, pause, startClip } from "./tuto.mjs";

const SITE = `https://${PROJECT}.ordomatics.com`;
const { page, finish } = await startClip("8-live", { storageState: AUTH, voiceOver: { say: SAY } });

await page.goto(`${PORTAL}/my/projects`);
await click(page, page.getByRole("link", { name: PROJECT, exact: true }).first());
await click(page, page.getByRole("link", { name: "production" }).first());
await page.getByRole("link", { name: "View logs" }).or(page.getByRole("button", { name: "View logs" })).first().waitFor();
await pause(page, 800);

await caption(page, "Your logs, in the portal");
await click(page, page.getByRole("link", { name: "View logs" }).or(page.getByRole("button", { name: "View logs" })).first(), { after: 2500 });
await page.getByText("Background jobs").first().waitFor({ timeout: 60000 });
await pause(page, 2000);
await click(page, page.getByText("Background jobs", { exact: true }).first(), { after: 2500 });
await click(page, page.getByText("Live updates", { exact: true }).first(), { after: 2500 });
await caption(page, null, 300);

await page.goto(`${SITE}/web/login`);
await page.locator("input[name=login]").waitFor();
await caption(page, "Sign in, then change the default password");
await click(page, page.locator("input[name=login]"), { after: 150 });
await page.keyboard.type("admin", { delay: 80 });
await click(page, page.locator("input[name=password]"), { after: 150 });
await page.keyboard.type("admin", { delay: 80 });
await click(page, page.getByRole("button", { name: "Log in" }), { after: 1000 });
await page.waitForURL(/\/odoo/, { timeout: 90000 });
await pause(page, 2500);

await page.goto(`${SITE}/odoo/action-dms.action_dms_file`);
await page.getByRole("button", { name: "New" }).first().waitFor({ timeout: 60000 });
await caption(page, "Your module, live");
await pause(page, 1200);
await click(page, page.getByRole("button", { name: "New" }).first(), { after: 1500 });
const field = page.locator(".o_field_widget[name=ged_reference]").first();
await field.waitFor({ timeout: 30000 });
const label = page.locator("label", { hasText: /^Reference/ }).first();
await highlight(page, (await label.count()) ? label : field);
await pause(page, 4500);
await highlight(page, null);
await caption(page, null, 600);
console.log(`ended on ${page.url()}`);
await finish();
