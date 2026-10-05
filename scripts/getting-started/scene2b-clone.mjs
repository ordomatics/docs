// Scene 2, second half: clone the new repository and create the dev branch.
import fs from "node:fs";
import { AUTH, GITHUB_USER, PROJECT, WORKDIR, openFolder, openTerminal, run, startVscode, until } from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, pause, startClip } from "./tuto.mjs";

fs.mkdirSync(WORKDIR, { recursive: true });
if (fs.existsSync(`${WORKDIR}/${PROJECT}`)) {
    throw new Error(`${WORKDIR}/${PROJECT} already exists: move it aside before re-recording the clone`);
}
await startVscode({ fresh: true });

const { page, finish, fastForward } = await startClip("2b-clone", { storageState: AUTH, voiceOver: { say: SAY } });
fastForward(12);                     // VS Code loading: nothing to watch
await openFolder(page, WORKDIR);
await openTerminal(page, { maximized: true });
fastForward();
await pause(page, 600);
await caption(page, "Clone it and create the dev branch");
await run(page, `git clone https://github.com/${GITHUB_USER}/${PROJECT}.git`, {
    until: () => until(() => fs.existsSync(`${WORKDIR}/${PROJECT}/modules.cfg`), { every: 1000, timeout: 120000, what: "the clone" }),
});
await run(page, `cd ${PROJECT}`);
await run(page, "git switch -c dev");
fastForward(3);
await run(page, "git push -u origin dev", { after: 7000 });
fastForward();
await pause(page, 1500);
await caption(page, null, 500);
await finish();
