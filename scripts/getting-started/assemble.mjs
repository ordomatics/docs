// Joins the scene clips into the one video shown at the top of the page, with a
// spoken title card in front and a closing card behind.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { DOCS, voiceLine } from "./common.mjs";
import { INTRO, OUTRO } from "./narration.mjs";
import { audioDuration, prependIntro } from "./tuto.mjs";

const DIR = path.join(DOCS, "public/getting-started");
const SCENES = ["1-create", "2a-repository", "2b-clone", "3-connect", "4-local", "5-module", "6-dev", "7-release", "8-live"];
const [W, H] = [1280, 800];
const OUT = path.join(DIR, "getting-started.mp4");

const clips = SCENES.map((name) => path.join(DIR, `${name}.mp4`));
for (const clip of clips) {
    if (!fs.existsSync(clip)) {
        throw new Error(`missing clip: ${clip}`);
    }
}

// One timeline: every clip brought to the same size, rate and audio layout.
const inputs = clips.flatMap((clip) => ["-i", clip]);
const graph = clips.map((_, i) => `[${i}:v]scale=${W}:${H},fps=25,format=yuv420p,setsar=1[v${i}];`
    + `[${i}:a]aformat=sample_rates=48000:channel_layouts=mono[a${i}]`).join(";")
    + `;${clips.map((_, i) => `[v${i}][a${i}]`).join("")}concat=n=${clips.length}:v=1:a=1[v][a]`;
execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...inputs, "-filter_complex", graph, "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k",
    "-movflags", "+faststart", OUT]);

await prependIntro(OUT, {
    title: "Getting Started",
    subtitle: "From nothing to your own Odoo module in production",
    note: "Create a project · Connect GitHub · Develop locally · Release",
    voice: await voiceLine(INTRO),
});

// The closing card, built the same way as the title card.
const tmp = fs.mkdtempSync("/tmp/tuto-outro-");
const card = path.join(tmp, "card.png");
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(`<!doctype html><meta charset="utf-8"><body style="margin:0;height:100vh;display:flex;
    flex-direction:column;align-items:center;justify-content:center;gap:22px;
    background:linear-gradient(160deg,#ffffff 0%,#eef2ff 100%);font-family:system-ui,sans-serif;color:#111827">
    <div style="font-size:46px;font-weight:800">Next steps</div>
    <div style="font-size:26px;color:#374151;max-width:900px;text-align:center;line-height:1.5">
        Add environments, databases and your own domain</div>
    <div style="margin-top:18px;font-size:19px;color:#2564eb;font-weight:600">docs.ordomatics.com · Manage your project</div></body>`);
await page.screenshot({ path: card });
await browser.close();
const voice = await voiceLine(OUTRO);
const seconds = (audioDuration(voice) + 2).toFixed(2);
const outro = path.join(tmp, "outro.mp4");
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-loop", "1", "-t", seconds, "-i", card, "-i", voice,
    "-filter_complex", `[0:v]fps=25,format=yuv420p,setsar=1,fade=in:st=0:d=0.4[v];`
        + "[1:a]aformat=sample_rates=48000:channel_layouts=mono,adelay=600:all=1,apad[a]",
    "-map", "[v]", "-map", "[a]", "-t", seconds, "-c:v", "libx264", "-preset", "slow", "-crf", "28",
    "-c:a", "aac", "-b:a", "96k", outro]);
const joined = path.join(tmp, "joined.mp4");
execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", OUT, "-i", outro, "-filter_complex",
    "[0:v]setsar=1[v0];[1:v]setsar=1[v1];[v0][0:a][v1][1:a]concat=n=2:v=1:a=1[v][a]", "-map", "[v]", "-map", "[a]",
    "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "96k",
    "-movflags", "+faststart", joined]);
fs.copyFileSync(joined, OUT);
fs.rmSync(tmp, { recursive: true, force: true });

// Where each scene starts in the finished video, for the page's chapter links.
let at = audioDuration(await voiceLine(INTRO)) + 1.6;
const chapters = {};
for (const [i, clip] of clips.entries()) {
    chapters[SCENES[i]] = Math.round(at);
    at += audioDuration(clip);
}
fs.writeFileSync(path.join(DIR, "chapters.json"), JSON.stringify(chapters, null, 2) + "\n");
console.log(`${OUT}  ${audioDuration(OUT).toFixed(0)} s`, chapters);
