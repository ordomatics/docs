// Social preview card (1200x630) for every tutorial page: logo, "Éditeur
// Smartacus", the page title, and a frame from the page's first video. Writes
// public/editeur/og/page-<slug>.jpg (English: public/editeur/en/og/…); skips
// existing cards unless --force. Run after adding or retitling a page.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DOCS = path.resolve(HERE, "../..");
const force = process.argv.includes("--force");
const logo = `data:image/png;base64,${fs.readFileSync(path.join(HERE, "assets/smartacus-logo.png")).toString("base64")}`;
const LANGS = [
    { dir: "src/content/docs/fr/editeur", out: "public/editeur/og", brand: "Éditeur Smartacus", kicker: "Tutoriel vidéo",
        overview: "Rédigez, dictez, importez et exportez vos documents", overviewClip: "6-scenario-complet.mp4" },
    { dir: "src/content/docs/editeur", out: "public/editeur/en/og", brand: "Smartacus editor", kicker: "Video tutorial",
        overview: "Write, dictate, import and export your documents", overviewClip: "en/6-scenario-complet.mp4" },
];

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
for (const lang of LANGS) {
    fs.mkdirSync(path.join(DOCS, lang.out), { recursive: true });
    for (const file of fs.readdirSync(path.join(DOCS, lang.dir)).filter((f) => f.endsWith(".mdx"))) {
        const slug = file.replace(/\.mdx$/, "");
        const out = path.join(DOCS, lang.out, `page-${slug}.jpg`);
        if (fs.existsSync(out) && !force) {
            continue;
        }
        const src = fs.readFileSync(path.join(DOCS, lang.dir, file), "utf8");
        // The overview's title is the brand itself: say what the tutorial covers instead.
        const overview = slug === "index";
        const title = overview ? lang.overview : src.match(/^title:\s*"?(.+?)"?\s*$/m)[1];
        const clip = src.match(/<Clip\b[^>]*\bsrc="([^"]+)"/)?.[1] ?? (overview ? lang.overviewClip : undefined);
        let frame = "";
        if (clip) {
            const video = path.join(DOCS, "public/editeur", clip);
            const d = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration",
                "-of", "csv=p=0", video], { encoding: "utf8" }));
            const png = execFileSync("ffmpeg", ["-loglevel", "error", "-ss", String(Math.max(0, d - 1.5)), "-i", video,
                "-frames:v", "1", "-vf", "scale=720:-2", "-f", "image2pipe", "-vcodec", "png", "-"]);
            frame = `<img src="data:image/png;base64,${png.toString("base64")}" style="position:absolute;right:-40px;
                bottom:-30px;width:640px;border-radius:14px;box-shadow:0 18px 50px rgba(17,24,39,.25);
                border:1px solid #d6e2ff">`;
        }
        await page.setContent(`<!doctype html><meta charset="utf-8"><body style="margin:0;width:1200px;height:630px;
            position:relative;overflow:hidden;font-family:system-ui,sans-serif;color:#111827;
            background:linear-gradient(150deg,#ffffff 0%,#e6f0ff 100%)">
            <div style="position:absolute;left:64px;top:60px;display:flex;align-items:center;gap:16px">
              <img src="${logo}" style="width:64px;height:64px;border-radius:15px">
              <div style="font-size:28px;font-weight:700;color:#2564eb">${escape(lang.brand)}</div></div>
            <div style="position:absolute;left:64px;top:190px;width:${clip ? 470 : 1000}px">
              <div style="font-size:22px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:1px">
                ${escape(lang.kicker)}</div>
              <div style="margin-top:14px;font-size:${title.length > 30 ? 46 : 56}px;font-weight:800;line-height:1.12">
                ${escape(title)}</div></div>
            ${frame}</body>`);
        await page.screenshot({ path: out, type: "jpeg", quality: 82 });
        console.log(out);
    }
}
await browser.close();
