// Scene 5: write the module, list it in modules.cfg, restart, see it locally.
import fs from "node:fs";
import {
    AUTH, HERE, PROJECT, REPO_DIR, command, focusEditor, openFolder, openTerminal, run, sh, startVscode, until,
} from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, click, highlight, pause, startClip } from "./tuto.mjs";

const LOCAL = "http://localhost:8069";
if (fs.existsSync(`${REPO_DIR}/addons/${PROJECT}`)) {
    throw new Error("the module is already there: reset the repository before re-recording this scene");
}
await startVscode({ fresh: true });

const { page, finish, fastForward } = await startClip("5-module", { storageState: AUTH, voiceOver: { say: SAY } });
fastForward(12);
await openFolder(page, REPO_DIR);
fastForward();
await pause(page, 600);

const open = async (name) => {
    await page.keyboard.press("Control+P");
    await pause(page, 500);
    await page.keyboard.type(name, { delay: 55 });
    await pause(page, 900);
    await page.keyboard.press("Enter");
    await page.locator(".tabs-container .tab", { hasText: name.split("/").pop() }).first().waitFor({ timeout: 15000 });
    await pause(page, 600);
};

await caption(page, "Write your module in addons/");
// The module's files are written here; the Explorer shows them arrive.
fs.cpSync(`${HERE}/module/${PROJECT}`, `${REPO_DIR}/addons/${PROJECT}`, { recursive: true });
await pause(page, 1500);
await open("models/dms_file.py");
await pause(page, 3500);
await open("views/dms_file_views.xml");
await pause(page, 3500);

await caption(page, "List it in modules.cfg");
await open("modules.cfg");
await focusEditor(page);
await page.keyboard.press("Control+End");
await page.keyboard.type("dms\nged\n", { delay: 110 });
await page.keyboard.press("Control+S");
await pause(page, 1500);
if (!fs.readFileSync(`${REPO_DIR}/modules.cfg`, "utf8").trimEnd().endsWith("dms\nged")) {
    throw new Error("modules.cfg does not end with dms and ged: the edit did not land");
}

await caption(page, "Restart to install it");
fastForward(15);
await openTerminal(page, { maximized: true });
fastForward();
await run(page, "docker compose restart odoo", { after: 2000 });
fastForward(30);
await until(() => sh(`docker compose exec -T db psql -U odoo -d ${PROJECT} -tAc "select state from ir_module_module where name='${PROJECT}'"`,
    { allowFail: true }).trim() === "installed", { timeout: 15 * 60 * 1000, every: 4000, what: "the module to install" });
await until(async () => (await fetch(`${LOCAL}/web/login`).then((r) => r.status).catch(() => 0)) === 200,
    { timeout: 10 * 60 * 1000, every: 3000, what: "local Odoo" });
// Signing in again is not the point of this scene.
await page.goto(`${LOCAL}/web/login`);
await page.locator("input[name=login]").fill("admin");
await page.locator("input[name=password]").fill("admin");
await page.getByRole("button", { name: "Log in" }).click();
await page.waitForURL(/\/odoo/, { timeout: 90000 });
await page.goto(`${LOCAL}/odoo/action-dms.action_dms_file`);
await page.getByRole("button", { name: "New" }).first().waitFor({ timeout: 60000 });
fastForward();
await pause(page, 1500);

await caption(page, "The new field, locally");
await click(page, page.getByRole("button", { name: "New" }).first(), { after: 1500 });
const field = page.locator(".o_field_widget[name=ged_reference]").first();
await field.waitFor({ timeout: 30000 });
await highlight(page, page.locator(".o_wrap_field, .o_cell", { has: page.locator("[name=ged_reference]") }).first().or(field).first());
await pause(page, 4000);
await highlight(page, null);
await caption(page, null, 500);
await finish();
