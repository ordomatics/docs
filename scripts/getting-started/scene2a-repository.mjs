// Scene 2, first half: create the repository from the template.
import { AUTH, GITHUB_USER, PROJECT, hideGithubNotices } from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, click, pause, startClip } from "./tuto.mjs";

const DRY = process.env.TUTO_DRY === "1";       // stop before anything is created

const { page, finish } = await startClip(DRY ? null : "2a-repository",
    { storageState: AUTH, voiceOver: DRY ? undefined : { say: SAY }, prepare: hideGithubNotices });

await page.goto("https://github.com/ordomatics/odoo-template");
await page.getByRole("button", { name: /Use this template/i }).waitFor();
await pause(page, 1000);
await caption(page, "Create your repository from the template");
await click(page, page.getByRole("button", { name: /Use this template/i }));
await click(page, page.getByRole("menuitem", { name: /Create a new repository/i }));
await page.getByLabel(/Repository name/).waitFor();
await pause(page, 800);

await click(page, page.getByLabel(/Repository name/), { after: 150 });
await page.keyboard.type(PROJECT, { delay: 90 });
await pause(page, 900);

await caption(page, "Private, without the other branches");
await click(page, page.getByRole("button", { name: /^Public$/ }));
await click(page, page.getByRole("menuitemradio", { name: /Private/ }).or(page.getByRole("option", { name: /Private/ })).first());
await pause(page, 1200);

if (DRY) {
    await page.screenshot({ path: "/tmp/scene2-dry.png", fullPage: true });
    console.log("dry run: stopped before Create repository");
    await finish();
    process.exit(0);
}

await click(page, page.getByRole("button", { name: "Create repository" }), { after: 1500 });
await page.waitForURL(new RegExp(`github\\.com/${GITHUB_USER}/${PROJECT}$`), { timeout: 120000 });
await page.getByRole("heading", { name: "README" }).or(page.locator("article")).first().waitFor({ timeout: 120000 });
await pause(page, 2500);
await caption(page, null, 300);

await finish();
