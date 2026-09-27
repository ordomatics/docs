// Shared helpers for recording the Smartacus editor tutorial against a local
// dev stack: a visible cursor, click highlights and French captions drawn
// into the page, plus MP4/PNG output straight into the docs site.
import { chromium } from "playwright";
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.resolve(HERE, "../..");
export const VIDEO_DIR = path.join(DOCS, "public/editeur");
export const IMAGE_DIR = path.join(DOCS, "src/assets/editeur");
export const BASE_URL = process.env.EDITOR_URL || "http://localhost:8069";
export const DEV_DIR = process.env.SMARTACUS_DEV_DIR
    || path.join(process.env.HOME, "projects/ordomatics/clients/smartacus/odoo");
const VIEWPORT = { width: 1440, height: 900 };

export function devEnv() {
    const env = {};
    for (const line of fs.readFileSync(path.join(DEV_DIR, ".env"), "utf8").split("\n")) {
        const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (m) {
            env[m[1]] = m[2];
        }
    }
    return env;
}

export function psql(sql) {
    return execFileSync("docker", ["compose", "exec", "-T", "db", "psql", "-U", "odoo", "-d", "odoo", "-tAc", sql],
        { cwd: DEV_DIR, encoding: "utf8" }).trim();
}

export function odooShell(code) {
    return execFileSync("docker", ["compose", "exec", "-T", "odoo", "odoo", "shell", "-d", "odoo", "--no-http", "--log-level=error"],
        { cwd: DEV_DIR, input: code, encoding: "utf8", stdio: ["pipe", "pipe", "ignore"] });
}

// Injected into every page: fake cursor, click ring and caption bar.
// Headless recordings show no system cursor, so the viewer needs one drawn.
const OVERLAY = () => {
    const install = () => {
        if (document.getElementById("tuto-cursor")) {
            return;
        }
        const style = document.createElement("style");
        style.textContent = `
            #tuto-cursor { position: fixed; z-index: 2147483647; pointer-events: none; width: 26px; height: 26px;
                transform: translate(-3px, -2px); transition: none; left: -50px; top: -50px; }
            .tuto-ring { position: fixed; z-index: 2147483646; pointer-events: none; width: 44px; height: 44px;
                margin: -22px 0 0 -22px; border-radius: 50%; border: 4px solid #f59e0b; background: rgba(245,158,11,.25);
                animation: tuto-ring .7s ease-out forwards; }
            @keyframes tuto-ring { from { transform: scale(.4); opacity: 1 } to { transform: scale(1.6); opacity: 0 } }
            #tuto-caption { position: fixed; z-index: 2147483647; left: 50%; bottom: 28px; transform: translateX(-50%);
                max-width: 80%; padding: 12px 22px; border-radius: 12px; background: rgba(17,24,39,.9); color: #fff;
                font: 600 20px/1.35 system-ui, sans-serif; text-align: center; pointer-events: none;
                box-shadow: 0 8px 24px rgba(0,0,0,.25); opacity: 0; transition: opacity .25s; }
            #tuto-caption.on { opacity: 1 }
            .tuto-box { position: fixed; z-index: 2147483645; pointer-events: none; border: 4px solid #f59e0b;
                border-radius: 10px; box-shadow: 0 0 0 9999px rgba(17,24,39,.18); }`;
        document.documentElement.appendChild(style);
        const cursor = document.createElement("div");
        cursor.id = "tuto-cursor";
        cursor.innerHTML = `<svg viewBox="0 0 24 24" width="26" height="26"><path d="M3 2l7 19 2.6-7.6L20 11z"
            fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
        document.documentElement.appendChild(cursor);
        const caption = document.createElement("div");
        caption.id = "tuto-caption";
        document.documentElement.appendChild(caption);
        // Chrome's red spell-check squiggles on French text distract in clips.
        const noSpellcheck = () => document.querySelectorAll("[contenteditable]").forEach((el) => {
            el.spellcheck = false;
        });
        new MutationObserver(noSpellcheck).observe(document.documentElement, { childList: true, subtree: true });
        noSpellcheck();
        document.addEventListener("mousemove", (e) => {
            cursor.style.left = e.clientX + "px";
            cursor.style.top = e.clientY + "px";
        }, true);
        window.__tuto = {
            ring(x, y) {
                const ring = document.createElement("div");
                ring.className = "tuto-ring";
                ring.style.left = x + "px";
                ring.style.top = y + "px";
                document.documentElement.appendChild(ring);
                setTimeout(() => ring.remove(), 800);
            },
            caption(text) {
                caption.textContent = text || "";
                caption.classList.toggle("on", !!text);
            },
            // Numbered outlines for an annotated tour screenshot.
            annotate(items) {
                document.querySelectorAll(".tuto-note").forEach((n) => n.remove());
                for (const { rect, n } of items) {
                    const b = document.createElement("div");
                    b.className = "tuto-note";
                    Object.assign(b.style, { position: "fixed", zIndex: 2147483645, pointerEvents: "none",
                        left: rect.x + 3 + "px", top: rect.y + 3 + "px",
                        width: rect.width - 6 + "px", height: rect.height - 6 + "px",
                        border: "3px solid #f59e0b", borderRadius: "8px" });
                    const badge = document.createElement("div");
                    badge.textContent = n;
                    // Centred on the box corner, so it sits mostly outside the region.
                    Object.assign(badge.style, { position: "absolute", width: "26px", height: "26px",
                        left: Math.max(-16, 2 - rect.x) + "px", top: Math.max(-16, 2 - rect.y) + "px",
                        borderRadius: "50%", background: "#f59e0b", color: "#111",
                        font: "700 15px/26px system-ui, sans-serif", textAlign: "center",
                        boxShadow: "0 2px 6px rgba(0,0,0,.3)" });
                    b.appendChild(badge);
                    document.documentElement.appendChild(b);
                }
            },
            box(rect) {
                document.querySelectorAll(".tuto-box").forEach((b) => b.remove());
                if (!rect) {
                    return;
                }
                const b = document.createElement("div");
                b.className = "tuto-box";
                Object.assign(b.style, { left: rect.x - 6 + "px", top: rect.y - 6 + "px",
                    width: rect.width + 12 + "px", height: rect.height + 12 + "px" });
                document.documentElement.appendChild(b);
            },
        };
    };
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", install);
    } else {
        install();
    }
};

/** Starts a recorded session. `finish()` writes public/editeur/<name>.mp4. */
export async function startClip(name, { storageState, env, audio = false, viewport = VIEWPORT } = {}) {
    const tmp = fs.mkdtempSync("/tmp/tuto-");
    const browser = await chromium.launch({
        channel: "chrome",
        headless: !audio,
        env: env ? { ...process.env, ...env } : undefined,
        args: ["--use-fake-ui-for-media-stream", "--lang=fr-FR"],
    });
    const context = await browser.newContext({
        viewport,
        locale: "fr-FR",
        permissions: ["microphone", "clipboard-read", "clipboard-write"],
        storageState,
        recordVideo: name ? { dir: tmp, size: viewport } : undefined,
    });
    await context.addInitScript(OVERLAY);
    const page = await context.newPage();
    const started = Date.now();
    return {
        page,
        context,
        async finish({ trimStart = 0 } = {}) {
            const video = page.video();
            await context.close();
            await browser.close();
            if (!name) {
                return null;
            }
            fs.mkdirSync(VIDEO_DIR, { recursive: true });
            const out = path.join(VIDEO_DIR, `${name}.mp4`);
            execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(trimStart), "-i", await video.path(),
                "-vf", "scale=1280:-2,fps=25", "-c:v", "libx264", "-preset", "slow", "-crf", "30",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out]);
            fs.rmSync(tmp, { recursive: true, force: true });
            console.log(`${out}  (${((Date.now() - started) / 1000).toFixed(0)} s)`);
            return out;
        },
    };
}

export const pause = (page, ms) => page.waitForTimeout(ms);

export async function caption(page, text, holdMs = 0) {
    await page.evaluate((t) => window.__tuto?.caption(t), text);
    if (holdMs) {
        await pause(page, holdMs);
    }
}

async function moveTo(page, locator) {
    await locator.waitFor({ state: "visible" });
    await locator.scrollIntoViewIfNeeded();
    const box = await locator.boundingBox();
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y, { steps: 28 });
    return { x, y };
}

/** Glides the cursor to the element, flashes a ring, then clicks it. */
export async function click(page, locator, { after = 700 } = {}) {
    const { x, y } = await moveTo(page, locator);
    await pause(page, 250);
    await page.evaluate(([cx, cy]) => window.__tuto?.ring(cx, cy), [x, y]);
    await page.mouse.click(x, y);
    await pause(page, after);
}

export async function type(page, locator, text, { delay = 55, after = 400 } = {}) {
    await click(page, locator, { after: 200 });
    await page.keyboard.type(text, { delay });
    await pause(page, after);
}

/** Outlines an element (for screenshots, or to point at something in a clip). */
export async function highlight(page, locator) {
    const rect = locator ? await locator.boundingBox() : null;
    await page.evaluate((r) => window.__tuto?.box(r), rect);
}

/** Numbers screen regions: [[locator | locator[], n], ...]; [] clears.
 *  An array outlines the union of its elements. */
export async function annotate(page, entries) {
    const items = [];
    for (const [target, n] of entries) {
        const boxes = [];
        for (const locator of [target].flat()) {
            boxes.push(await locator.boundingBox());
        }
        const x = Math.min(...boxes.map((b) => b.x));
        const y = Math.min(...boxes.map((b) => b.y));
        const right = Math.max(...boxes.map((b) => b.x + b.width));
        const bottom = Math.max(...boxes.map((b) => b.y + b.height));
        items.push({ rect: { x, y, width: right - x, height: bottom - y }, n });
    }
    await page.evaluate((list) => window.__tuto?.annotate(list), items);
}

/** Saves src/assets/editeur/<name>.png, without cursor or caption. */
export async function screenshot(page, name, { clip } = {}) {
    fs.mkdirSync(IMAGE_DIR, { recursive: true });
    await page.evaluate(() => {
        for (const id of ["tuto-cursor", "tuto-caption"]) {
            const el = document.getElementById(id);
            if (el) {
                el.style.visibility = "hidden";
            }
        }
    });
    const out = path.join(IMAGE_DIR, `${name}.png`);
    await page.screenshot({ path: out, clip });
    await page.evaluate(() => {
        for (const id of ["tuto-cursor", "tuto-caption"]) {
            const el = document.getElementById(id);
            if (el) {
                el.style.visibility = "";
            }
        }
    });
    console.log(out);
}

/**
 * Speech from Soynade (run on the dev stack, whose output stays local),
 * padded and resampled for the virtual mic. Cached under voices/ by name.
 */
export function soynadeVoice(name, text, language = "fr", sourceLanguage = language) {
    const dir = path.join(HERE, "voices");
    const out = path.join(dir, `${name}.wav`);
    if (fs.existsSync(out)) {
        return out;
    }
    fs.mkdirSync(dir, { recursive: true });
    const inputs = JSON.stringify({ text, target_language: language, source_language: sourceLanguage, output_format: "wav", seed: 7 });
    odooShell(`
import base64, json
tool = env['llm.tool'].search([('name', '=', 'soynade_speak')], limit=1)
res = tool.soynade_speak_execute(json.loads(${JSON.stringify(inputs)}))
att = env['ir.attachment'].browse(res['urls'][0]['attachment_id'])
open('/tmp/tuto-voice.wav', 'wb').write(base64.b64decode(att.datas))
att.unlink()
env.cr.commit()
`);
    const raw = path.join(dir, `${name}.raw.wav`);
    execFileSync("docker", ["compose", "cp", "odoo:/tmp/tuto-voice.wav", raw], { cwd: DEV_DIR });
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-t", "1", "-i", "anullsrc=r=48000:cl=mono",
        "-i", raw, "-f", "lavfi", "-t", "5", "-i", "anullsrc=r=48000:cl=mono", "-filter_complex",
        "[1:a]aresample=48000,aformat=channel_layouts=mono[v];[0:a][v][2:a]concat=n=3:v=0:a=1",
        "-c:a", "pcm_s16le", out]);
    fs.rmSync(raw);
    return out;
}

/** Plays a WAV into the PipeWire virtual mic created by withVirtualMic(). */
export function playIntoMic(wav) {
    return new Promise((resolve) => {
        spawn("pw-cat", ["--playback", "--target", "tutorial_sink", wav], { stdio: "ignore" }).on("exit", resolve);
    });
}

/**
 * Chrome's speech recognition reads the real system mic and ignores its
 * fake-audio flags, so dictation clips need a PipeWire virtual source that
 * only the recording browser is pointed at (PULSE_SOURCE).
 */
export async function withVirtualMic(fn) {
    const loop = spawn("pw-loopback", ["-n", "tutorial",
        "--capture-props=media.class=Audio/Sink node.name=tutorial_sink",
        "--playback-props=media.class=Audio/Source node.name=tutorial_mic"], { stdio: "ignore" });
    await new Promise((r) => setTimeout(r, 1500));
    try {
        return await fn({ PULSE_SOURCE: "tutorial_mic" });
    } finally {
        loop.kill();
    }
}
