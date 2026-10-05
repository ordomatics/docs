// Scene 4: run the project locally: .env, docker compose up, Odoo on localhost.
import fs from "node:fs";
import {
    AUTH, PROJECT, REPO_DIR, command, focusEditor, openFolder, openTerminal, run, setLine, sh, startVscode, until,
} from "./common.mjs";
import { SAY } from "./narration.mjs";
import { caption, click, pause, startClip } from "./tuto.mjs";

const LOCAL = "http://localhost:8069";
if (fs.existsSync(`${REPO_DIR}/.env`)) {
    throw new Error(".env already exists: reset the local project before re-recording this scene");
}
await startVscode({ fresh: true });

const { page, finish, fastForward } = await startClip("4-local", { storageState: AUTH, voiceOver: { say: SAY } });
fastForward(12);
await openFolder(page, REPO_DIR);
await openTerminal(page);
fastForward();
await pause(page, 600);

await caption(page, "Set up your local environment");
await run(page, "cp .env.example .env");

// Three values, edited in the editor.
// From the Explorer: the file search skips git-ignored files, and .env is one.
const envFile = page.locator(".explorer-folders-view .monaco-list-row").filter({ hasText: /^\.env$/ });
await envFile.waitFor({ timeout: 20000 });
await click(page, envFile);
await focusEditor(page);
await setLine(page, 4, `COMPOSE_PROJECT_NAME=${PROJECT}`);
await setLine(page, 8, "PLATFORM_TAG=18.0");
await setLine(page, 15, `DB_NAME=${PROJECT}`);
await page.keyboard.press("Control+S");
await pause(page, 1500);
const env = fs.readFileSync(`${REPO_DIR}/.env`, "utf8");
for (const line of [`COMPOSE_PROJECT_NAME=${PROJECT}`, "PLATFORM_TAG=18.0", `DB_NAME=${PROJECT}`]) {
    if (!env.split("\n").includes(line)) {
        throw new Error(`.env does not contain "${line}": the edit did not land`);
    }
}

await caption(page, "Start the stack");
fastForward(20);                     // the command palette is not part of the story
await page.locator(".terminal-wrapper .xterm").first().click();
await command(page, "View: Toggle Maximized Panel");
await page.locator(".terminal-wrapper .xterm").first().click();
fastForward();
await run(page, "docker compose up --build -d", { after: 2500 });
// Image build and first-start module install: minutes, played fast.
fastForward(40);
await until(async () => (await fetch(`${LOCAL}/web/login`).then((r) => r.status).catch(() => 0)) === 200,
    { timeout: 25 * 60 * 1000, every: 4000, what: "local Odoo" });
await run(page, "docker compose ps --format '{{.Name}}  {{.Status}}'", { after: 1500 });
fastForward();
await pause(page, 1500);
await caption(page, null, 300);

await page.goto(`${LOCAL}/web/login`);
await page.locator("input[name=login]").waitFor();
await caption(page, "Odoo, on your machine");
await click(page, page.locator("input[name=login]"), { after: 150 });
await page.keyboard.type("admin", { delay: 80 });
await click(page, page.locator("input[name=password]"), { after: 150 });
await page.keyboard.type("admin", { delay: 80 });
await click(page, page.getByRole("button", { name: "Log in" }), { after: 1000 });
await page.waitForURL(/\/odoo/, { timeout: 90000 });
await pause(page, 4500);
await caption(page, null, 500);
console.log(sh("docker compose ps --format '{{.Name}} {{.Status}}'"));
await finish();
