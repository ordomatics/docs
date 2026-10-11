// "Make a change and test it": edit the module, run it locally, push to dev, see it on the test environment.
// No voice-over. The change is applied to the files here, then shown on camera.
import fs from "node:fs";
import path from "node:path";
import {
    AUTH, DOCS, PROJECT, REPO_DIR, openFolder, openTerminal, run, sh, startVscode, until,
} from "../getting-started/common.mjs";
import { caption, configure, pause, startClip } from "../getting-started/tuto.mjs";
import { hideGithubNotices } from "../getting-started/common.mjs";
import { FIELD, showField, waitForImage, watchRun } from "./ship.mjs";

configure({ videoDir: path.join(DOCS, "public/manage") });

const LOCAL = "http://localhost:8069";
const MODEL = `${REPO_DIR}/addons/${PROJECT}/models/dms_file.py`;
const VIEWS = `${REPO_DIR}/addons/${PROJECT}/views/dms_file_views.xml`;

if (fs.readFileSync(MODEL, "utf8").includes(FIELD)) {
    throw new Error("the change is already in the module: reset the repository before re-recording");
}
if (sh("git status --porcelain").trim()) {
    throw new Error("the working tree is not clean");
}
await startVscode({ fresh: true });

const { page, finish, fastForward } = await startClip("ship-a-change-test",
    { storageState: AUTH, prepare: hideGithubNotices });
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

await caption(page, "Make your change in your module: here, a new field");
fs.appendFileSync(MODEL, `
    ${FIELD} = fields.Date(
        string='Filed on', copy=False, default=fields.Date.context_today,
        help='The day the document was filed.')
`);
let views = fs.readFileSync(VIEWS, "utf8");
views = views.replaceAll('                <field name="ged_reference"/>\n',
    `                <field name="ged_reference"/>\n                <field name="${FIELD}"/>\n`);
fs.writeFileSync(VIEWS, views);
await pause(page, 1200);
await open("models/dms_file.py");
await pause(page, 3500);
await open("views/dms_file_views.xml");
await pause(page, 3500);

await caption(page, "See exactly what changed");
fastForward(15);
await openTerminal(page, { maximized: true });
fastForward();
await run(page, "git diff", { after: 5000 });

await caption(page, "Restart to try it locally");
await run(page, "docker compose restart odoo", { after: 2000 });
fastForward(30);
await until(() => sh(`docker compose exec -T db psql -U odoo -d ${PROJECT} -tAc "select count(*) from information_schema.columns where table_name='dms_file' and column_name='${FIELD}'"`,
    { allowFail: true }).trim() === "1", { timeout: 15 * 60 * 1000, every: 4000, what: "the new column" });
await until(async () => (await fetch(`${LOCAL}/web/login`).then((r) => r.status).catch(() => 0)) === 200,
    { timeout: 10 * 60 * 1000, every: 3000, what: "local Odoo" });
fastForward();
await caption(page, null, 300);

await showField(page, LOCAL, "The new field, locally");
await caption(page, null, 500);

await openFolder(page, REPO_DIR);
await openTerminal(page, { maximized: true });
await caption(page, "Commit and push to dev");
await run(page, "git add -A");
await run(page, 'git commit -m "GED: record the day a document was filed"');
fastForward(3);
await run(page, "git push", { after: 6000 });
fastForward();
const sha = sh("git rev-parse HEAD").trim();
await pause(page, 1200);
await caption(page, null, 300);

await watchRun(page, { sha, branch: "dev", fastForward, text: "CI builds and tests your image" });
await waitForImage(page, { environment: "test", sha, fastForward, text: "The test environment runs it" });

await showField(page, `https://${PROJECT}.test.ordomatics.com`, "On the test environment: a copy of your database");
await showField(page, `https://teranga.${PROJECT}.test.ordomatics.com`, "And on a client's copy");
await caption(page, null, 600);
console.log(`dev commit: ${sha}`);
await finish();
