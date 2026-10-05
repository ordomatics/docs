// Recorder for app tutorial clips: drives a real browser with Playwright and
// draws a visible cursor, click rings, caption bar and highlight boxes into
// the page, then writes MP4 clips (optionally sped up and voiced) and PNG
// screenshots. Copy this file into the project (e.g. docs/scripts/tutorial/)
// and call configure() once from each recording script.
import { chromium } from "playwright";
import { execFileSync, spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const CONFIG = {
    videoDir: "tutorial-out/videos",
    imageDir: "tutorial-out/images",
    viewport: { width: 1440, height: 900 },
    outputWidth: 1280,
    locale: "en-US",
    // Target-language captions: { "<caption as written in the scripts>": "<translation>" }.
    // null records the captions as written.
    captions: null,
    // Voice-over adapter: async (captionText) => path of an audio file to play
    // while that caption is shown. Only used by clips started with voiceOver.
    voice: null,
    // When true, screenshot() does nothing (e.g. a second-language run that
    // reuses the first language's screenshots).
    skipScreenshots: false,
};

/** Sets output folders, viewport, locale, caption translations and voice adapter. */
export function configure(options) {
    Object.assign(CONFIG, options);
    return CONFIG;
}

// Injected into every page: fake cursor, click ring, caption bar, outlines.
// Headless recordings show no system cursor, so the viewer needs one drawn.
const OVERLAY = () => {
    const install = () => {
        if (document.getElementById("tuto-cursor")) {
            return;
        }
        const style = document.createElement("style");
        style.textContent = `
            #tuto-cursor { position: fixed; z-index: 2147483647; pointer-events: none; width: 26px; height: 26px;
                transform: translate(-3px, -2px); left: -50px; top: -50px; }
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
        // Red spell-check squiggles (especially on non-English text) distract in clips.
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
                    // Centred on the box corner, so it hides as little of the region as possible.
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

export function audioDuration(file) {
    return parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration",
        "-of", "csv=p=0", file], { encoding: "utf8" }));
}

/** What a caption says aloud: no emoji, quote marks or bracketed asides. */
export function spokenText(text) {
    return text.replace(/\([^)]*\)/g, "").replace(/[«»"“”…]|\p{Extended_Pictographic}|️/gu, "")
        .replace(/\s+/g, " ").trim();
}

/**
 * Cached, checked voice line. `synthesize(text, seed)` must write an audio
 * file and return { file, spoken } (spoken = the text actually voiced, e.g.
 * after translation). Trailing silence is trimmed, and takes far longer than
 * the text needs are rejected and retried with another seed: speech models
 * sometimes babble on well past the text.
 */
export async function guardedVoiceLine({ dir, text, synthesize, seeds = [7, 11, 23, 42], secondsPerChar = 0.1 }) {
    const key = crypto.createHash("sha1").update(text).digest("hex").slice(0, 12);
    const out = path.join(dir, `${key}.wav`);
    if (fs.existsSync(out)) {
        return out;
    }
    fs.mkdirSync(dir, { recursive: true });
    for (const seed of seeds) {
        const { file, spoken } = await synthesize(text, seed);
        execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", file, "-af",
            "areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse", "-ar", "48000", "-ac", "1", out]);
        const seconds = audioDuration(out);
        if (seconds <= (spoken || text).length * secondsPerChar + 1.5) {
            fs.writeFileSync(path.join(dir, `${key}.txt`), `SOURCE: ${text}\nSPOKEN: ${spoken || text}\nseed: ${seed}\n`);
            return out;
        }
        console.log(`rejected ${seconds.toFixed(1)} s take (seed ${seed}) for: ${spoken || text}`);
        fs.rmSync(out);
    }
    throw new Error(`No usable voice take for: ${text}`);
}

// Voice-over state per recorded page: when each caption's line starts, and
// until when it is still being spoken (the next caption waits for it).
const VOICE = new WeakMap();

/**
 * Starts a recorded session (name = null for screenshots only).
 * Options: storageState (logged-in session), env (extra browser env, e.g. a
 * virtual mic), headed (visible browser: needed for the PDF viewer and speech
 * recognition), viewport, voiceOver: { say, overrides } where say maps a
 * caption to the text to voice instead, overrides to a ready audio file.
 * `finish()` writes <videoDir>/<name>.mp4 and returns its path.
 */
export async function startClip(name, { storageState, env, headed = false, viewport = CONFIG.viewport, voiceOver, prepare } = {}) {
    const tmp = fs.mkdtempSync("/tmp/tuto-");
    const browser = await chromium.launch({
        channel: "chrome",
        headless: !headed,
        env: env ? { ...process.env, ...env } : undefined,
        args: ["--use-fake-ui-for-media-stream", `--lang=${CONFIG.locale}`],
    });
    const context = await browser.newContext({
        viewport,
        locale: CONFIG.locale,
        permissions: ["microphone", "clipboard-read", "clipboard-write"],
        storageState,
        // GitHub's content security policy refuses the overlay's <style> element.
        bypassCSP: true,
        recordVideo: name ? { dir: tmp, size: viewport } : undefined,
    });
    await context.addInitScript(OVERLAY);
    if (prepare) {
        await prepare(context);     // init scripts must be registered before the page exists
    }
    const page = await context.newPage();
    const started = Date.now();
    const marks = [];
    const voice = voiceOver
        ? { started, cues: [], busyUntil: 0, overrides: voiceOver.overrides || {}, say: voiceOver.say || {} }
        : null;
    if (voice) {
        if (!CONFIG.voice) {
            throw new Error("voiceOver needs configure({ voice })");
        }
        VOICE.set(page, voice);
    }
    return {
        page,
        context,
        /** Call before and after a long wait: that stretch plays `factor`x faster. */
        fastForward(factor = 8) {
            const at = (Date.now() - started) / 1000;
            const open = marks.at(-1);
            if (open && open.end === undefined) {
                open.end = at;
            } else {
                marks.push({ start: at, factor });
            }
        },
        async finish({ trimStart = 0.5 } = {}) {
            if (voice && voice.busyUntil > Date.now()) {
                await page.waitForTimeout(voice.busyUntil - Date.now());
            }
            const video = page.video();
            await context.close();
            await browser.close();
            if (!name) {
                fs.rmSync(tmp, { recursive: true, force: true });
                return null;
            }
            fs.mkdirSync(CONFIG.videoDir, { recursive: true });
            const out = path.join(CONFIG.videoDir, `${name}.mp4`);
            const cuts = marks.filter((m) => m.end !== undefined);
            // One segment at a time, each cut from the file by seeking, then joined
            // without re-encoding. A single filter graph that trims one input many
            // times makes ffmpeg hold the video in memory: a ten-minute recording
            // exhausted a 32 GB machine.
            const segments = [];
            let t = trimStart;
            for (const m of cuts) {
                segments.push({ from: t, to: m.start, factor: 1 });
                segments.push({ from: m.start, to: m.end, factor: m.factor });
                t = m.end;
            }
            segments.push({ from: t, to: null, factor: 1 });
            const source = await video.path();
            const files = [];
            for (const [i, seg] of segments.entries()) {
                if (seg.to !== null && seg.to - seg.from < 0.04) {
                    continue;
                }
                const file = path.join(tmp, `part-${i}.mp4`);
                execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(seg.from),
                    ...(seg.to === null ? [] : ["-to", String(seg.to)]), "-i", source,
                    "-vf", `setpts=(PTS-STARTPTS)/${seg.factor},scale=${CONFIG.outputWidth}:-2,fps=25`,
                    "-c:v", "libx264", "-preset", "medium", "-crf", "28", "-pix_fmt", "yuv420p", "-an",
                    "-video_track_timescale", "12800", file]);
                files.push(file);
            }
            const list = path.join(tmp, "parts.txt");
            fs.writeFileSync(list, files.map((f) => `file '${f}'\n`).join(""));
            execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list,
                "-c", "copy", "-movflags", "+faststart", out]);
            if (voice?.cues.length) {
                // Each line at its caption's time on the final (sped-up) timeline.
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
                const delays = voice.cues.map((c, i) => `[${i + 1}:a]aformat=sample_rates=48000:channel_layouts=mono,`
                    + `adelay=${Math.round(outputTime(c.at) * 1000)}:all=1[a${i}]`);
                const mix = `${delays.join(";")};${voice.cues.map((_, i) => `[a${i}]`).join("")}`
                    + `amix=inputs=${voice.cues.length}:normalize=0:duration=longest,apad[a]`;
                execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", silent, ...inputs,
                    "-filter_complex", mix, "-map", "0:v", "-map", "[a]", "-c:v", "copy",
                    "-c:a", "aac", "-b:a", "96k", "-shortest", "-movflags", "+faststart", out]);
            }
            fs.rmSync(tmp, { recursive: true, force: true });
            console.log(`${out}  (${((Date.now() - started) / 1000).toFixed(0)} s recorded)`);
            return out;
        },
    };
}

export const pause = (page, ms) => page.waitForTimeout(ms);

function localize(text) {
    if (!text || !CONFIG.captions) {
        return text;
    }
    if (!(text in CONFIG.captions)) {
        // Fail loudly: a silently untranslated caption ships the wrong language.
        throw new Error(`No translated caption for: ${text}`);
    }
    return CONFIG.captions[text];
}

/** Shows a caption (null hides it); with voiceOver, speaks it and paces the clip to the voice. */
export async function caption(page, text, holdMs = 0) {
    const voice = VOICE.get(page);
    if (voice && text) {
        if (voice.busyUntil > Date.now()) {
            await pause(page, voice.busyUntil - Date.now());
        }
        const file = voice.overrides[text] || await CONFIG.voice(voice.say[text] || text);
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

/** Clicks into a field and types visibly. */
export async function type(page, locator, text, { delay = 55, after = 400 } = {}) {
    await click(page, locator, { after: 200 });
    await page.keyboard.type(text, { delay });
    await pause(page, after);
}

/** Outlines one element and dims the rest (null clears). */
export async function highlight(page, locator) {
    const rect = locator ? await locator.boundingBox() : null;
    await page.evaluate((r) => window.__tuto?.box(r), rect);
}

/** Numbered outlines for a screen tour: [[locator | locator[], n], ...]; an array outlines the union. */
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

/** Saves <imageDir>/<name>.png without the cursor or caption. */
export async function screenshot(page, name, { clip } = {}) {
    if (CONFIG.skipScreenshots) {
        return null;
    }
    fs.mkdirSync(CONFIG.imageDir, { recursive: true });
    const setHidden = (hidden) => page.evaluate((h) => {
        for (const id of ["tuto-cursor", "tuto-caption"]) {
            const el = document.getElementById(id);
            if (el) {
                el.style.visibility = h ? "hidden" : "";
            }
        }
    }, hidden);
    await setHidden(true);
    const out = path.join(CONFIG.imageDir, `${name}.png`);
    await page.screenshot({ path: out, clip });
    await setHidden(false);
    console.log(out);
    return out;
}

/**
 * Prepends a title card to a finished clip: logo (optional image path), title,
 * subtitle and note on screen while `voice` (an audio file) plays, fading in
 * and out, then the clip. Rewrites clipFile in place.
 */
export async function prependIntro(clipFile, { title, subtitle = "", note = "", voice, logo, accent = "#2564eb" }) {
    const tmp = fs.mkdtempSync("/tmp/tuto-intro-");
    const card = path.join(tmp, "card.png");
    const logoTag = logo ? `<img src="data:image/png;base64,${fs.readFileSync(logo).toString("base64")}"
        style="width:120px;height:120px;border-radius:26px;box-shadow:0 10px 30px rgba(0,0,0,.18)">` : "";
    const [w, h] = [CONFIG.outputWidth, Math.round(CONFIG.outputWidth * CONFIG.viewport.height / CONFIG.viewport.width)];
    const browser = await chromium.launch({ channel: "chrome" });
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.setContent(`<!doctype html><meta charset="utf-8"><body style="margin:0;height:100vh;display:flex;
        flex-direction:column;align-items:center;justify-content:center;gap:22px;
        background:linear-gradient(160deg,#ffffff 0%,#eef2ff 100%);font-family:system-ui,sans-serif;color:#111827">
        ${logoTag}<div style="font-size:52px;font-weight:800">${title}</div>
        <div style="font-size:26px;color:#374151;max-width:900px;text-align:center;line-height:1.35">${subtitle}</div>
        <div style="margin-top:18px;font-size:17px;color:${accent};font-weight:600">${note}</div></body>`);
    await page.screenshot({ path: card });
    await browser.close();

    const seconds = ((voice ? audioDuration(voice) : 2) + 1.6).toFixed(2);
    const intro = path.join(tmp, "intro.mp4");
    const audioIn = voice ? ["-i", voice] : ["-f", "lavfi", "-t", seconds, "-i", "anullsrc=r=48000:cl=mono"];
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-loop", "1", "-t", seconds, "-i", card, ...audioIn,
        "-filter_complex", `[0:v]fps=25,format=yuv420p,fade=in:st=0:d=0.4,fade=out:st=${(seconds - 0.4).toFixed(2)}:d=0.4[v];`
            + "[1:a]aformat=sample_rates=48000:channel_layouts=mono,adelay=600:all=1,apad[a]",
        "-map", "[v]", "-map", "[a]", "-t", seconds, "-c:v", "libx264", "-preset", "slow", "-crf", "30",
        "-c:a", "aac", "-b:a", "96k", intro]);
    const hasAudio = execFileSync("ffprobe", ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index",
        "-of", "csv=p=0", clipFile], { encoding: "utf8" }).trim() !== "";
    const joined = path.join(tmp, "joined.mp4");
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", intro, "-i", clipFile,
        ...(hasAudio ? [] : ["-f", "lavfi", "-i", "anullsrc=r=48000:cl=mono"]),
        "-filter_complex", `${hasAudio ? "" : "[2:a]atrim=0:1[s];"}[1:v]scale=${w}:${h},fps=25,format=yuv420p,setsar=1[cv];`
            + `[0:v]setsar=1[iv];[iv][0:a][cv]${hasAudio ? "[1:a]" : "[s]"}concat=n=2:v=1:a=1[v][a]`,
        "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-pix_fmt", "yuv420p",
        "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", joined]);
    fs.copyFileSync(joined, clipFile);
    fs.rmSync(tmp, { recursive: true, force: true });
    console.log(`${clipFile}  (+ ${seconds} s intro)`);
}

/** Plays an audio file into the virtual mic created by withVirtualMic() (Linux, PipeWire). */
export function playIntoMic(file) {
    return new Promise((resolve) => {
        spawn("pw-cat", ["--playback", "--target", "tutorial_sink", file], { stdio: "ignore" }).on("exit", resolve);
    });
}

/**
 * Chrome's speech recognition records from the real system microphone and
 * ignores --use-file-for-fake-audio-capture, so a dictation demo needs a
 * PipeWire virtual source that only the recording browser uses. Pass the
 * env it hands you to startClip({ env, headed: true }).
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

/**
 * Silent stand-in for window.speechSynthesis, for read-aloud features:
 * context.addInitScript(SILENT_TTS). The real voice would play through the
 * machine's speakers while recording and the clip is silent anyway; this fires
 * the same start/end events at a normal speaking pace.
 */
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
