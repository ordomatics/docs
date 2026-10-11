// "Release it": fast-forward main to dev, watch the release reach production. No voice-over.
import path from "node:path";
import {
    AUTH, DOCS, PROJECT, REPO_DIR, hideGithubNotices, openFolder, openTerminal, run, sh, startVscode,
} from "../getting-started/common.mjs";
import { caption, configure, pause, startClip } from "../getting-started/tuto.mjs";
import { showField, waitForImage, watchRun } from "./ship.mjs";

configure({ videoDir: path.join(DOCS, "public/manage") });

await startVscode({ fresh: true });

const { page, finish, fastForward } = await startClip("ship-a-change-release",
    { storageState: AUTH, prepare: hideGithubNotices });
fastForward(12);
await openFolder(page, REPO_DIR);
await openTerminal(page, { maximized: true });
fastForward();
await pause(page, 600);

await caption(page, "Happy with it on test? Fast-forward main to dev");
await run(page, "git switch main");
await run(page, "git merge --ff-only dev");
fastForward(3);
await run(page, "git push", { after: 6000 });
fastForward();
const sha = sh("git rev-parse HEAD").trim();
await run(page, "git switch dev");
await pause(page, 1000);
await caption(page, null, 300);

await watchRun(page, { sha, branch: "main", fastForward, text: "Released without rebuilding: the image you tested" });
await waitForImage(page, { environment: "production", sha, fastForward, text: "Production runs it" });

await showField(page, `https://${PROJECT}.ordomatics.com`, "Live: your production database");
await showField(page, `https://teranga.${PROJECT}.ordomatics.com`, "And your client's own database");
await caption(page, null, 600);
console.log(`release commit: ${sha}`);
await finish();
