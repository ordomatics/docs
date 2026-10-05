// Shared setup for the Getting Started video: output folders, the saved session,
// the Soynade voice adapter and the VS Code-in-the-browser helpers.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { audioDuration, configure, pause } from "./tuto.mjs";

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DOCS = path.resolve(HERE, "../..");
export const AUTH = path.join(HERE, ".auth/session.json");
export const PORTAL = "https://odoo.ordomatics.com";
export const PROJECT = process.env.TUTO_PROJECT || "ged";
export const GITHUB_USER = process.env.TUTO_GITHUB_USER || "mctrjllh";
// Where the tutorial's repository is cloned and worked on, on camera.
export const WORKDIR = process.env.TUTO_WORKDIR || path.join(process.env.HOME, "projects/ordomatics/clients", PROJECT);
export const REPO_DIR = path.join(WORKDIR, PROJECT);
export const VSCODE_PORT = 8123;
export const VSCODE_URL = `http://127.0.0.1:${VSCODE_PORT}`;

// The local stack Soynade is reached through (as the Smartacus tutorial does).
const VOICE_DIR = process.env.SMARTACUS_DEV_DIR || path.join(process.env.HOME, "projects/ordomatics/clients/smartacus/odoo");

// Variables a developer's shell may export that override a project's .env in
// compose. The recorded terminal, and every compose call here, runs without them.
export function cleanEnv() {
    const env = { ...process.env };
    for (const key of Object.keys(env)) {
        if (/^(DB_|ODOO_|ADMIN_PASSWD|PLATFORM_TAG|COMPOSE_PROJECT_NAME)/.test(key)) {
            delete env[key];
        }
    }
    return env;
}

function odooShell(script) {
    return execFileSync("docker", ["compose", "exec", "-T", "odoo", "odoo", "shell", "-d", "odoo", "--no-http",
        "--http-port=8079", "--gevent-port=8089"], { cwd: VOICE_DIR, input: script, encoding: "utf8",
        stdio: ["pipe", "pipe", "ignore"], maxBuffer: 64 * 1024 * 1024 });
}

const words = (text) => text.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);

/** How much of `text` a transcription of the take contains, 0..1. */
function heard(text, transcript) {
    const said = new Set(words(transcript));
    const wanted = words(text);
    return wanted.filter((w) => said.has(w)).length / Math.max(1, wanted.length);
}

function synthesize(text, seed, file) {
    const out = odooShell(`
import base64, json
tool = env['llm.tool'].search([('name', '=', 'soynade_speak')], limit=1)
res = tool.soynade_speak_execute(json.loads(${JSON.stringify(JSON.stringify({
        text, target_language: "en", source_language: "en", output_format: "wav", seed,
    }))}))
att = env['ir.attachment'].browse(res['urls'][0]['attachment_id'])
open('/tmp/tuto-voice.wav', 'wb').write(base64.b64decode(att.datas))
check = env['llm.tool'].search([('name', '=', 'odoo_transcribe')], limit=1)
heard = check.odoo_transcribe_execute({'attachment_ids': [att.id], 'language': 'en'})
att.unlink()
env.cr.commit()
print("HEARD:" + (heard.get('results') or [{}])[0].get('transcript', ''))
`);
    execFileSync("docker", ["compose", "cp", "odoo:/tmp/tuto-voice.wav", file], { cwd: VOICE_DIR, stdio: "ignore" });
    return out.split("\n").find((l) => l.startsWith("HEARD:"))?.slice(6) || "";
}

/**
 * A cached narration line in Soynade's default English voice. A take is kept
 * only if a transcription of it starts like the text and contains most of it,
 * and it is no longer than the words need: the model sometimes prepends a word
 * or runs on past the text.
 */
export async function voiceLine(text) {
    const dir = path.join(HERE, "voices/en");
    const key = crypto.createHash("sha1").update(text).digest("hex").slice(0, 12);
    const out = path.join(dir, `${key}.wav`);
    if (fs.existsSync(out)) {
        return out;
    }
    fs.mkdirSync(dir, { recursive: true });
    const raw = path.join(dir, `${key}.raw.wav`);
    for (const seed of [7, 11, 23, 42, 5, 99]) {
        const transcript = synthesize(text, seed, raw);
        execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", raw, "-af",
            "silenceremove=start_periods=1:start_threshold=-45dB,areverse,"
            + "silenceremove=start_periods=1:start_threshold=-45dB,areverse", "-ar", "48000", "-ac", "1", out]);
        fs.rmSync(raw);
        const seconds = audioDuration(out);
        const score = heard(text, transcript);
        const sameStart = words(transcript)[0] === words(text)[0];
        if (score >= 0.7 && sameStart && seconds <= text.length * 0.1 + 1.5) {
            fs.writeFileSync(path.join(dir, `${key}.txt`),
                `TEXT: ${text}\nHEARD: ${transcript}\nseed: ${seed}  seconds: ${seconds.toFixed(1)}\n`);
            return out;
        }
        console.log(`rejected take (seed ${seed}, ${seconds.toFixed(1)} s, heard ${Math.round(score * 100)} %): ${transcript}`);
        fs.rmSync(out);
    }
    throw new Error(`No usable voice take for: ${text}`);
}

configure({
    videoDir: path.join(DOCS, "public/getting-started"),
    imageDir: path.join(DOCS, "src/assets/getting-started"),
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    voice: voiceLine,
});

// ---- VS Code in the browser: the real editor and a real terminal, on camera ----

/** Stops the VS Code server, and with it any terminal it would restore. */
export function stopVscode() {
    try {
        const pids = execFileSync("pgrep", ["-f", `[s]erve-web --host 127.0.0.1 --port ${VSCODE_PORT}`], { encoding: "utf8" });
        for (const pid of pids.split("\n").filter(Boolean)) {
            process.kill(Number(pid));
        }
    } catch {
        // not running
    }
    try {
        execFileSync("pkill", ["-f", `[s]erver-main.js.*--port=${VSCODE_PORT}|[s]erver-main.js.*${path.join(HERE, ".auth/vscode")}`]);
    } catch {
        // none
    }
}

/** Starts `code serve-web` on the tutorial's folder, with a clean environment. */
export async function startVscode({ fresh = false } = {}) {
    if (fresh) {
        stopVscode();
        await new Promise((r) => setTimeout(r, 2500));
    }
    const data = path.join(HERE, ".auth/vscode");
    // Machine settings: the web client keeps user settings in the browser, which
    // is new for every recording, so only these reach it.
    const settings = path.join(data, "data/Machine/settings.json");
    fs.mkdirSync(path.dirname(settings), { recursive: true });
    fs.writeFileSync(settings, JSON.stringify({
        "workbench.startupEditor": "none",
        "workbench.colorTheme": "Default Dark Modern",
        "workbench.secondarySideBar.defaultVisibility": "hidden",
        "chat.commandCenter.enabled": false,
        "extensions.ignoreRecommendations": true,
        "security.workspace.trust.enabled": false,
        "editor.fontSize": 17,
        "editor.minimap.enabled": false,
        "terminal.integrated.fontSize": 18,
        "terminal.integrated.defaultProfile.linux": "tutorial",
        "terminal.integrated.profiles.linux": {
            tutorial: { path: "bash", args: ["--noprofile", "--rcfile", path.join(HERE, "terminal.bashrc")] },
        },
        "terminal.integrated.inheritEnv": false,
        "terminal.integrated.enablePersistentSessions": false,
        "terminal.integrated.persistentSessionReviveProcess": "never",
        "terminal.integrated.shellIntegration.enabled": false,
        "window.commandCenter": false,
        "telemetry.telemetryLevel": "off",
        "update.mode": "none",
        "git.openRepositoryInParentFolders": "never",
    }, null, 2));
    const up = async () => fetch(VSCODE_URL).then((r) => r.ok).catch(() => false);
    if (await up()) {
        return;
    }
    const server = spawn("code", ["serve-web", "--host", "127.0.0.1", "--port", String(VSCODE_PORT),
        "--without-connection-token", "--accept-server-license-terms", "--server-data-dir", data],
    { env: cleanEnv(), stdio: "ignore", detached: true });
    server.unref();
    for (let i = 0; i < 60 && !(await up()); i++) {
        await new Promise((r) => setTimeout(r, 2000));
    }
    if (!(await up())) {
        throw new Error("VS Code for the web did not start");
    }
}

/** Opens a folder in VS Code and waits for the workbench. */
export async function openFolder(page, folder) {
    await page.goto(`${VSCODE_URL}/?folder=${encodeURIComponent(folder)}`);
    await page.waitForSelector(".monaco-workbench", { timeout: 90000 });
    await pause(page, 3000);
    // The Chat side panel opens by default and takes a third of the screen.
    if (await page.locator(".part.auxiliarybar").isVisible().catch(() => false)) {
        await command(page, "View: Close Secondary Side Bar");
    }
}

/** Runs a VS Code command by its palette title (e.g. "View: Toggle Maximized Panel"). */
export async function command(page, title) {
    await page.keyboard.press("F1");
    await pause(page, 500);
    await page.keyboard.type(title, { delay: 8 });
    await pause(page, 700);
    await page.keyboard.press("Enter");
    await pause(page, 900);
}

/** Opens (or focuses) the integrated terminal and waits for its prompt.
 *  `maximized` gives it the whole window, for scenes that are only a terminal. */
export async function openTerminal(page, { maximized = false } = {}) {
    if (!(await page.locator(".terminal-wrapper .xterm").count())) {
        await page.keyboard.press("Control+Backquote");
    }
    await page.waitForSelector(".terminal-wrapper .xterm", { timeout: 30000 });
    await pause(page, 2500);
    if (await page.locator(".monaco-dialog-box").count()) {
        throw new Error("VS Code is showing a dialog: " + (await page.locator(".monaco-dialog-box").innerText()).slice(0, 120));
    }
    if (maximized) {
        await command(page, "View: Toggle Maximized Panel");
    }
    await page.locator(".terminal-wrapper .xterm").first().click();
    await pause(page, 400);
}

/** Types a command in the terminal and runs it; waits for `until` (a promise factory) if given. */
export async function run(page, command, { delay = 28, after = 1200, until } = {}) {
    await page.keyboard.type(command, { delay });
    await pause(page, 350);
    await page.keyboard.press("Enter");
    if (until) {
        await until();
    }
    await pause(page, after);
}

/** Runs something off camera, in the tutorial's clean environment. */
export function sh(command, { cwd = REPO_DIR, allowFail = false } = {}) {
    try {
        return execFileSync("bash", ["-c", command], { cwd, env: cleanEnv(), encoding: "utf8",
            stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
    } catch (error) {
        if (allowFail) {
            return (error.stdout || "") + (error.stderr || "");
        }
        throw error;
    }
}

/** Polls until `test()` is truthy. */
export async function until(test, { timeout = 900000, every = 5000, what = "condition" } = {}) {
    const deadline = Date.now() + timeout;
    for (;;) {
        const value = await test();
        if (value) {
            return value;
        }
        if (Date.now() > deadline) {
            throw new Error(`Timed out waiting for ${what}`);
        }
        await new Promise((r) => setTimeout(r, every));
    }
}

/** Hides GitHub's account-wide notice banner (two-factor reminder) in a recording.
 *  A stylesheet rule, not an inline style: the banner is re-rendered by React. */
export async function hideGithubNotices(context) {
    await context.addInitScript(() => {
        if (!/(^|\.)github\.com$/.test(location.hostname)) {
            return;
        }
        // Re-added when missing: GitHub's in-page navigation replaces the document's children.
        const ensure = () => {
            if (!document.documentElement || document.getElementById("tuto-hide-notices")) {
                return;
            }
            const style = document.createElement("style");
            style.id = "tuto-hide-notices";
            // The same notice is rendered two ways, depending on the page.
            style.textContent = "section[class*='prc-Banner-Banner'], #js-flash-container .flash-warn "
                + "{ display: none !important }";
            document.documentElement.appendChild(style);
        };
        ensure();
        setInterval(ensure, 150);
    });
}

/** Puts the keyboard in the editor pane, visibly. Not a centre click: a file's
 *  text area is taller than the pane, so its centre can lie under the terminal. */
export async function focusEditor(page) {
    const pane = page.locator(".editor-group-container .monaco-editor").first();
    await pane.locator(".view-lines").waitFor();
    const box = await pane.boundingBox();
    const [x, y] = [box.x + Math.min(360, box.width / 2), box.y + 70];
    await page.mouse.move(x, y, { steps: 24 });
    await pause(page, 200);
    await page.evaluate(([cx, cy]) => window.__tuto?.ring(cx, cy), [x, y]);
    await page.mouse.click(x, y);
    await page.locator(".editor-group-container .monaco-editor.focused").waitFor({ timeout: 10000 });
    await pause(page, 400);
}

/** Replaces one line of the open file, typing visibly. */
export async function setLine(page, line, text) {
    await page.keyboard.press("Control+G");
    await pause(page, 400);
    await page.keyboard.type(String(line), { delay: 60 });
    await page.keyboard.press("Enter");
    await pause(page, 400);
    await page.keyboard.press("Home");
    await page.keyboard.press("Shift+End");
    await page.keyboard.type(text, { delay: 45 });
    await pause(page, 700);
}
