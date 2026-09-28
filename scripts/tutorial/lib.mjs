// Shared helpers for recording the Smartacus editor tutorial against a local
// dev stack: a visible cursor, click highlights and French captions drawn
// into the page, plus MP4/PNG output straight into the docs site.
import { chromium } from "playwright";
import { execFileSync, spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.resolve(HERE, "../..");
// TUTO_LANG=en records the English clips: captions from captions.en.json,
// videos under public/editeur/en/ (screenshots have no captions and are shared).
export const LANG = process.env.TUTO_LANG === "en" ? "en" : "fr";
const EN_CAPTIONS = LANG === "en" ? JSON.parse(fs.readFileSync(path.join(HERE, "captions.en.json"), "utf8")) : {};
export const VIDEO_DIR = path.join(DOCS, "public/editeur", LANG === "en" ? "en" : "");
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
        const noSpellcheck = () => document.querySelectorAll("[contenteditable], textarea, input").forEach((el) => {
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

// Voice-over state per recorded page: when each caption's line starts, and
// until when it is still being spoken (the next caption waits for it).
const VOICE = new WeakMap();

function audioDuration(file) {
    return parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration",
        "-of", "csv=p=0", file], { encoding: "utf8" }));
}

/** What a caption says aloud: no emoji, quote marks or bracketed asides. */
function spokenText(text) {
    return text.replace(/\([^)]*\)/g, "").replace(/[«»"“”…]|\p{Extended_Pictographic}|️/gu, "")
        .replace(/\s+/g, " ").trim();
}

/**
 * A French caption spoken by Soynade in `language` ("wo": translated to Wolof,
 * then voiced; "fr": voiced as is), cached under voices/<language>/ with the
 * text Soynade actually spoke next to it.
 */
export function voiceLine(frText, language = "wo") {
    const dir = path.join(HERE, "voices", language);
    const key = crypto.createHash("sha1").update(spokenText(frText)).digest("hex").slice(0, 12);
    const out = path.join(dir, `${key}.wav`);
    if (fs.existsSync(out)) {
        return out;
    }
    fs.mkdirSync(dir, { recursive: true });
    const raw = path.join(dir, `${key}.raw.wav`);
    // The voice model sometimes babbles on well past the text (confirmed by
    // transcribing one back): reject takes far longer than the words need.
    for (const seed of [7, 11, 23, 42]) {
        const inputs = JSON.stringify({ text: spokenText(frText), target_language: language, source_language: "fr",
            output_format: "wav", seed });
        const spoken = odooShell(`
import base64, json
tool = env['llm.tool'].search([('name', '=', 'soynade_speak')], limit=1)
res = tool.soynade_speak_execute(json.loads(${JSON.stringify(inputs)}))
att = env['ir.attachment'].browse(res['urls'][0]['attachment_id'])
open('/tmp/tuto-voice.wav', 'wb').write(base64.b64decode(att.datas))
att.unlink()
env.cr.commit()
print("SPOKEN:" + res['output_data']['spoken_text'])
`).split("\n").find((l) => l.startsWith("SPOKEN:"))?.slice(7) || "";
        execFileSync("docker", ["compose", "cp", "odoo:/tmp/tuto-voice.wav", raw], { cwd: DEV_DIR });
        // Trailing silence would hold the next caption back for nothing.
        execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", raw, "-af",
            "areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse", "-ar", "48000", "-ac", "1", out]);
        fs.rmSync(raw);
        const seconds = audioDuration(out);
        if (seconds <= spoken.length * 0.1 + 1.5) {
            fs.writeFileSync(path.join(dir, `${key}.txt`), `FR: ${spokenText(frText)}\n${language.toUpperCase()}: ${spoken}\nseed: ${seed}\n`);
            return out;
        }
        console.log(`rejected ${seconds.toFixed(1)} s take (seed ${seed}) for: ${spoken}`);
        fs.rmSync(out);
    }
    throw new Error(`No usable ${language} take for: ${frText}`);
}

export const wolofLine = (frText) => voiceLine(frText, "wo");

/** Starts a recorded session. `finish()` writes public/editeur/<name>.mp4.
 *  `voiceOver: { language, say, overrides }` adds a Soynade voice-over ("wo" by
 *  default, or "fr"), one line per caption.
 *  `say` maps a caption to simpler French to translate (Soynade's Wolof
 *  translation fails on longer phrasings); `overrides` to an audio file. */
export async function startClip(name, { storageState, env, audio = false, viewport = VIEWPORT, voiceOver } = {}) {
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
    const marks = [];
    const voice = voiceOver
        ? {
            started, cues: [], busyUntil: 0, overrides: voiceOver.overrides || {}, say: voiceOver.say || {},
            language: voiceOver.language || "wo",
        }
        : null;
    if (voice) {
        VOICE.set(page, voice);
    }
    return {
        page,
        context,
        /** Marks a stretch (e.g. waiting on the AI) to play `factor`x faster. */
        fastForward(factor = 8) {
            const at = (Date.now() - started) / 1000;
            const open = marks.at(-1);
            if (open && open.end === undefined) {
                open.end = at;
            } else {
                marks.push({ start: at, factor });
            }
        },
        async finish({ trimStart = 0 } = {}) {
            if (voice && voice.busyUntil > Date.now()) {
                await page.waitForTimeout(voice.busyUntil - Date.now());
            }
            const video = page.video();
            await context.close();
            await browser.close();
            if (!name) {
                return null;
            }
            fs.mkdirSync(VIDEO_DIR, { recursive: true });
            const out = path.join(VIDEO_DIR, `${name}.mp4`);
            // Sped-up stretches: split the timeline and retime those parts.
            const cuts = marks.filter((m) => m.end !== undefined);
            const parts = [];
            let t = trimStart;
            for (const m of cuts) {
                parts.push(`[0:v]trim=${t}:${m.start},setpts=PTS-STARTPTS[p${parts.length}]`);
                parts.push(`[0:v]trim=${m.start}:${m.end},setpts=(PTS-STARTPTS)/${m.factor}[p${parts.length}]`);
                t = m.end;
            }
            parts.push(`[0:v]trim=start=${t},setpts=PTS-STARTPTS[p${parts.length}]`);
            const graph = `${parts.join(";")};${parts.map((_, i) => `[p${i}]`).join("")}concat=n=${parts.length}:v=1:a=0,scale=1280:-2,fps=25[v]`;
            execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", await video.path(),
                "-filter_complex", graph, "-map", "[v]", "-c:v", "libx264", "-preset", "slow", "-crf", "30",
                "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", out]);
            if (voice?.cues.length) {
                // Each line at its caption's time on the final (retimed) timeline.
                const outputTime = (at) => {
                    let o = 0;
                    let from = trimStart;
                    for (const m of cuts) {
                        if (at <= m.start) {
                            return o + Math.max(0, at - from);
                        }
                        o += m.start - from;
                        if (at <= m.end) {
                            return o + (at - m.start) / m.factor;
                        }
                        o += (m.end - m.start) / m.factor;
                        from = m.end;
                    }
                    return o + Math.max(0, at - from);
                };
                const silent = path.join(tmp, "silent.mp4");
                fs.renameSync(out, silent);
                const inputs = voice.cues.flatMap((c) => ["-i", c.file]);
                const delays = voice.cues.map((c, i) => {
                    const ms = Math.round(outputTime(c.at) * 1000);
                    return `[${i + 1}:a]aformat=sample_rates=48000:channel_layouts=mono,adelay=${ms}:all=1[a${i}]`;
                });
                const mix = `${delays.join(";")};${voice.cues.map((_, i) => `[a${i}]`).join("")}`
                    + `amix=inputs=${voice.cues.length}:normalize=0:duration=longest,apad[a]`;
                execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", silent, ...inputs,
                    "-filter_complex", mix, "-map", "0:v", "-map", "[a]", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart", out]);
            }
            fs.rmSync(tmp, { recursive: true, force: true });
            console.log(`${out}  (${((Date.now() - started) / 1000).toFixed(0)} s)`);
            return out;
        },
    };
}

export const pause = (page, ms) => page.waitForTimeout(ms);

function localize(text) {
    if (!text || LANG === "fr") {
        return text;
    }
    if (!(text in EN_CAPTIONS)) {
        throw new Error(`No English caption for: ${text}`);
    }
    return EN_CAPTIONS[text];
}

export async function caption(page, text, holdMs = 0) {
    const voice = VOICE.get(page);
    if (voice && text) {
        // One line at a time: the next caption waits for the current line.
        if (voice.busyUntil > Date.now()) {
            await pause(page, voice.busyUntil - Date.now());
        }
        const file = voice.overrides[text] || voiceLine(voice.say[text] || text, voice.language);
        voice.cues.push({ at: (Date.now() - voice.started) / 1000, file });
        voice.busyUntil = Date.now() + audioDuration(file) * 1000 + 300;
    }
    await page.evaluate((t) => window.__tuto?.caption(t), localize(text));
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
    if (LANG === "en") {
        return; // the French screenshots are shared
    }
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

const LOGO = path.join(DEV_DIR, "addons/smartacus/smartacus_editor/static/src/img/logo.png");

/**
 * Prepends a title card to a finished clip: logo, title and subtitle on screen
 * while `voice` (an audio file) plays, fading in and out, then the clip.
 */
export async function prependIntro(clipFile, { title, subtitle, note, voice }) {
    const tmp = fs.mkdtempSync("/tmp/tuto-intro-");
    const card = path.join(tmp, "card.png");
    const logo = `data:image/png;base64,${fs.readFileSync(LOGO).toString("base64")}`;
    const browser = await chromium.launch({ channel: "chrome" });
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.setContent(`<!doctype html><meta charset="utf-8"><body style="margin:0;height:100vh;display:flex;
        flex-direction:column;align-items:center;justify-content:center;gap:22px;
        background:linear-gradient(160deg,#ffffff 0%,#e6f0ff 100%);font-family:system-ui,sans-serif;color:#111827">
        <img src="${logo}" style="width:120px;height:120px;border-radius:26px;box-shadow:0 10px 30px rgba(37,100,235,.25)">
        <div style="font-size:52px;font-weight:800;letter-spacing:-.5px">${title}</div>
        <div style="font-size:26px;color:#374151;max-width:900px;text-align:center;line-height:1.35">${subtitle}</div>
        <div style="margin-top:18px;font-size:17px;color:#2564eb;font-weight:600">${note}</div></body>`);
    await page.screenshot({ path: card });
    await browser.close();

    const seconds = (0.6 + audioDuration(voice) + 1.0).toFixed(2);
    const intro = path.join(tmp, "intro.mp4");
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-loop", "1", "-t", seconds, "-i", card, "-i", voice,
        "-filter_complex", `[0:v]fps=25,format=yuv420p,fade=in:st=0:d=0.4,fade=out:st=${(seconds - 0.4).toFixed(2)}:d=0.4[v];`
            + "[1:a]aformat=sample_rates=48000:channel_layouts=mono,adelay=600:all=1,apad[a]",
        "-map", "[v]", "-map", "[a]", "-t", seconds, "-c:v", "libx264", "-preset", "slow", "-crf", "30",
        "-c:a", "aac", "-b:a", "96k", intro]);
    // Re-encoded join: the clip may have no audio track, so give it silence.
    const hasAudio = execFileSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index",
        "-of", "csv=p=0", clipFile], { encoding: "utf8" }).trim() !== "";
    const joined = path.join(tmp, "joined.mp4");
    const clipAudio = hasAudio ? "[1:a]" : "[s]";
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", intro, "-i", clipFile,
        ...(hasAudio ? [] : ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono"]),
        "-filter_complex", `${hasAudio ? "" : "[2:a]atrim=0:1[s];"}[1:v]fps=25,format=yuv420p,setsar=1[cv];`
            + `[0:v]setsar=1[iv];[iv][0:a][cv]${clipAudio}concat=n=2:v=1:a=1[v][a]`,
        "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", joined]);
    fs.copyFileSync(joined, clipFile);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`${clipFile}  (+ intro, ${seconds} s)`);
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

// Chrome on Linux would speak through the machine's speakers while recording,
// and the clip is silent anyway. This stand-in fires the same start/end events
// at a normal speaking pace; the app's own timed highlighting does the rest,
// exactly as with the real Linux voice (which reports no word boundaries).
export const SILENT_TTS = () => {
    let timer = null;
    let current = null;
    window.speechSynthesis.speak = (utterance) => {
        current = utterance;
        setTimeout(() => {
            utterance.onstart?.(new Event("start"));
            timer = setTimeout(() => utterance.onend?.(new Event("end")), (utterance.text.length / 17) * 1000);
        }, 150);
    };
    window.speechSynthesis.cancel = () => {
        clearTimeout(timer);
        if (current) {
            const done = current;
            current = null;
            setTimeout(() => done.onend?.(new Event("end")), 0);
        }
    };
};
