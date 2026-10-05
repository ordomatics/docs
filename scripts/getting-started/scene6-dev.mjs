// Scene 6: commit, push to dev, watch CI build and test the image.
import {
    AUTH, GITHUB_USER, PROJECT, REPO_DIR, hideGithubNotices, openFolder, openTerminal, run, sh, startVscode, until,
} from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, pause, startClip } from "./tuto.mjs";

const REPO = `${GITHUB_USER}/${PROJECT}`;
await startVscode({ fresh: true });

const { page, finish, fastForward } = await startClip("6-dev",
    { storageState: AUTH, voiceOver: { say: SAY }, prepare: hideGithubNotices });
fastForward(12);
await openFolder(page, REPO_DIR);
await openTerminal(page, { maximized: true });
fastForward();
await pause(page, 600);

await caption(page, "Commit and push to dev");
await run(page, "git add -A");
await run(page, 'git commit -m "GED: a filing reference on documents"');
fastForward(3);
await run(page, "git push", { after: 6000 });
fastForward();
const sha = sh("git rev-parse HEAD").trim();
await pause(page, 1200);
await caption(page, null, 300);

await page.goto(`https://github.com/${REPO}/actions`);
await page.getByRole("heading", { name: /workflow runs?|All workflows/i }).first().waitFor({ timeout: 60000 }).catch(() => {});
await pause(page, 1500);
await caption(page, "CI builds and tests your image");
await pause(page, 5000);
// The run takes minutes; the page is reloaded as it goes, played fast.
fastForward(30);
const result = await until(async () => {
    const out = sh(`gh run list --repo ${REPO} --commit ${sha} --workflow "CI/CD Pipeline" --json status,conclusion -q '.[0] | "\\(.status) \\(.conclusion)"'`,
        { allowFail: true }).trim();
    await page.reload();
    return out.startsWith("completed") ? out : null;
}, { timeout: 30 * 60 * 1000, every: 15000, what: "the dev run" });
fastForward();
if (!/success/.test(result)) {
    throw new Error(`the dev run did not succeed: ${result}`);
}
await pause(page, 4000);
await caption(page, null, 500);
console.log(`dev run for ${sha.slice(0, 7)}: ${result}`);
await finish();
