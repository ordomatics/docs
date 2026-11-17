// Scene 3: run the connect command in the terminal and keep the token it prints.
import { AUTH, WORK, handoff, openFolder, openTerminal, run, startVscode, until } from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, pause, startClip } from "../getting-started/tuto.mjs";

const connect = handoff.read("connect.txt");
await startVscode({ fresh: true });

const { page, finish, fastForward } = await startClip("3-connect", { storageState: AUTH, voiceOver: { say: SAY } });
fastForward(12);
await openFolder(page, WORK);
await openTerminal(page, { maximized: true });
fastForward();
await pause(page, 600);

const screen = () => page.locator(".terminal-wrapper .xterm-rows").first().innerText();
await caption(page, "Run the connect command");
await run(page, connect, { delay: 12, after: 800 });
await until(async () => /Connect THIS cluster/.test(await screen()), { timeout: 120000, every: 1000, what: "the question" });
await pause(page, 3500);
await page.keyboard.type("y", { delay: 200 });
await page.keyboard.press("Enter");

await caption(page, "It installs our connector");
fastForward(10);
const token = await until(async () => {
    const lines = (await screen()).split("\n").map((l) => l.trim()).filter(Boolean);
    const at = lines.lastIndexOf("connected");
    return at >= 0 && lines[at + 1] && /^[A-Za-z0-9._=-]{40,}$/.test(lines[at + 1]) ? lines[at + 1] : null;
}, { timeout: 15 * 60 * 1000, every: 3000, what: "the cluster token" });
fastForward();
handoff.write("token.txt", token);
await pause(page, 4000);
await caption(page, null, 400);
await finish();
