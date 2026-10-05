// Scene 3: connect GitHub from the portal, install the app on one repository, pick it.
import { AUTH, GITHUB_USER, PORTAL, PROJECT, hideGithubNotices } from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, click, highlight, pause, startClip } from "./tuto.mjs";

const DRY = process.env.TUTO_DRY === "1";       // stop before installing
const REPO = `${GITHUB_USER}/${PROJECT}`;

const { page, finish, fastForward } = await startClip(DRY ? null : "3-connect",
    { storageState: AUTH, voiceOver: DRY ? undefined : { say: SAY }, prepare: hideGithubNotices });

await page.goto(`${PORTAL}/my/projects`);
await click(page, page.getByRole("link", { name: PROJECT, exact: true }).first());
await page.getByRole("button", { name: "Connect GitHub" }).waitFor();
await pause(page, 800);

await caption(page, "Connect GitHub");
await click(page, page.getByRole("button", { name: "Connect GitHub" }), { after: 1500 });
await page.waitForURL(/github\.com\/apps\/.*installations\/new/, { timeout: 60000 });
await page.getByRole("button", { name: "Install", exact: true }).waitFor();
await pause(page, 1500);

await click(page, page.getByLabel("Only select repositories"));
const picker = page.getByRole("button", { name: /Select repositories/ }).or(page.locator("summary", { hasText: "Select repositories" })).first();
await click(page, picker);
await page.keyboard.type(PROJECT, { delay: 90 });
await pause(page, 1500);
await click(page, page.getByRole("option", { name: new RegExp(REPO) })
    .or(page.locator("[role=menuitem], .select-menu-item, li", { hasText: REPO })).first());
await pause(page, 800);
await page.keyboard.press("Escape");
await pause(page, 1200);

if (DRY) {
    await page.screenshot({ path: "/tmp/scene3-dry.png", fullPage: true });
    console.log("dry run: stopped before Install;", (await page.locator("form").first().innerText()).replace(/\s+/g, " ").slice(0, 260));
    await finish();
    process.exit(0);
}

await click(page, page.getByRole("button", { name: "Install", exact: true }), { after: 1500 });
// GitHub hands back to the platform, which sends the customer to their projects.
fastForward(4);
await page.waitForURL(new RegExp(`^${PORTAL.replace(/\./g, "\\.")}`), { timeout: 120000 });
await page.waitForLoadState("networkidle").catch(() => {});
fastForward();
console.log(`back on: ${page.url()}`);
await pause(page, 1500);
await caption(page, null, 300);

if (!/\/my\/projects\/\d+/.test(page.url())) {
    await page.goto(`${PORTAL}/my/projects`);
    await click(page, page.getByRole("link", { name: PROJECT, exact: true }).first());
}
const use = page.getByRole("button", { name: "Use", exact: true });
fastForward(6);                       // the platform reads which repositories it was given
for (let i = 0; i < 40 && !(await use.count()); i++) {
    await pause(page, 3000);
    await page.reload();
}
fastForward();
await use.waitFor({ timeout: 20000 });
await caption(page, "Pick your repository and click Use");
await pause(page, 1500);
await click(page, use, { after: 2500 });

await caption(page, "The platform sets up your pipeline");
await highlight(page, page.locator(".card", { hasText: "Code & deploy" }).first());
await pause(page, 4000);
await highlight(page, null);
// Until the wiring is done, the page says so; then it offers to refresh the settings.
fastForward(6);
for (let i = 0; i < 40 && !(await page.getByText("Refresh pipeline settings").count()); i++) {
    await pause(page, 3000);
    await page.reload();
}
fastForward();
await pause(page, 2500);
await caption(page, null, 500);
console.log(`ended on: ${page.url()}`);
await finish();
