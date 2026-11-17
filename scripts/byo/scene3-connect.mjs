// Scene 3: run the connect command in the terminal and keep the token it prints.
import { AUTH, WORK, handoff, openFolder, openTerminal, requireMinikube, run, sh, startVscode, until, scene } from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, pause, startClip } from "../getting-started/tuto.mjs";

requireMinikube();
const connect = handoff.read("connect.txt");
await startVscode({ fresh: true });

const { page, finish, fastForward } = await scene("3-connect", { storageState: AUTH, voiceOver: { say: SAY } });
fastForward(12);
await openFolder(page, WORK);
await openTerminal(page, { maximized: true });
fastForward();
await pause(page, 600);

await caption(page, "Run the connect command");
await run(page, connect, { delay: 12, after: 800 });
// The checks before the question take seconds; the xterm canvas has no text to wait on.
await pause(page, 14000);
await page.keyboard.type("y", { delay: 200 });
await page.keyboard.press("Enter");

await caption(page, "It installs our connector");
fastForward(10);
// connect.sh waits for the tunnel before printing; the token Secret exists earlier, and the
// portal's check fails if it runs before the connector has registered.
await until(() => sh("kubectl -n ordomatics-system logs deployment/cloudflared --since=15m 2>/dev/null | grep -c 'Registered tunnel connection'",
    { cwd: WORK, allowFail: true }).trim() > "0", { timeout: 15 * 60 * 1000, every: 3000, what: "the connector's tunnel" });
// The token is a Secret the connector's bootstrap leaves on the cluster; connect.sh prints it from there.
const token = await until(() => sh("kubectl -n ordomatics-system get secret ordomatics-token -o jsonpath='{.data.token}' 2>/dev/null | base64 -d",
    { cwd: WORK, allowFail: true }).trim(), { timeout: 15 * 60 * 1000, every: 3000, what: "the cluster token" });
fastForward();
handoff.write("token.txt", token);
await pause(page, 4000);
await caption(page, null, 400);
await finish();
