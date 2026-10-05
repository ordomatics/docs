// Scene 7: fast-forward main to dev, watch the release reach production.
import {
    AUTH, GITHUB_USER, PORTAL, PROJECT, REPO_DIR, hideGithubNotices, openFolder, openTerminal, run, sh, startVscode, until,
} from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, click, highlight, pause, startClip } from "./tuto.mjs";

const REPO = `${GITHUB_USER}/${PROJECT}`;
await startVscode({ fresh: true });

const { page, finish, fastForward } = await startClip("7-release",
    { storageState: AUTH, voiceOver: { say: SAY }, prepare: hideGithubNotices });
fastForward(12);
await openFolder(page, REPO_DIR);
await openTerminal(page, { maximized: true });
fastForward();
await pause(page, 600);

await caption(page, "Fast-forward main to dev");
await run(page, "git switch main");
await run(page, "git merge --ff-only dev");
fastForward(3);
await run(page, "git push", { after: 6000 });
fastForward();
const sha = sh("git rev-parse HEAD").trim();
await run(page, "git switch dev");
await pause(page, 1000);
await caption(page, null, 300);

await page.goto(`https://github.com/${REPO}/actions`);
await pause(page, 2500);
await caption(page, "Released without rebuilding");
await pause(page, 5000);
fastForward(30);
const result = await until(async () => {
    const out = sh(`gh run list --repo ${REPO} --branch main --commit ${sha} --workflow "CI/CD Pipeline" --json status,conclusion -q '.[0] | "\\(.status) \\(.conclusion)"'`,
        { allowFail: true }).trim();
    await page.reload();
    return out.startsWith("completed") ? out : null;
}, { timeout: 30 * 60 * 1000, every: 15000, what: "the release run" });
fastForward();
if (!/success/.test(result)) {
    throw new Error(`the release run did not succeed: ${result}`);
}
await pause(page, 3000);
await caption(page, null, 300);

// The portal: the new image arrives, then the environment is up to date.
await page.goto(`${PORTAL}/my/projects`);
await click(page, page.getByRole("link", { name: PROJECT, exact: true }).first());
await click(page, page.getByRole("link", { name: "production" }).first());
await page.locator(".card", { hasText: "Code & deploy" }).first().waitFor();
const tag = `prod-${sha.slice(0, 8)}`;
fastForward(30);
await until(async () => {
    await page.reload();
    const card = await page.locator(".card", { hasText: "Code & deploy" }).first().innerText();
    return card.includes(tag) && /Up to date/.test(card);
}, { timeout: 30 * 60 * 1000, every: 10000, what: `${tag} to be running and up to date` });
fastForward();
await caption(page, "Up to date");
await highlight(page, page.locator(".card", { hasText: "Code & deploy" }).first());
await pause(page, 4500);
await highlight(page, null);
await caption(page, null, 500);
console.log(`released ${tag}`);
await finish();
