// Du papier à WhatsApp : the phone brings the paper in and takes the document
// out. Run with `node part8-telephone.mjs`. The phone is a frame drawn over
// the laptop page; its camera and share sheet belong to the phone's own system
// and are drawn as illustrations.
import fs from "node:fs";
import { BASE_URL, caption, click, highlight, pause, screenshot, startClip } from "./lib.mjs";
import { AUTH, collapseCopilot, openEditor, resetWorkspace } from "./demo.mjs";
import { PHOTO_JPG, makeSamples } from "./samples.mjs";

const DRY = !!process.env.TUTO_DRY;
const local = (link) => link.replace(/^https?:\/\/[^/]+/, BASE_URL);
const screen = (page) => page.frameLocator("#tuto-phone-screen");

// A phone-sized frame on the right of the laptop page, with room for the
// system screens (camera, share sheet) drawn over its browser.
const PHONE = () => {
    const style = document.createElement("style");
    style.textContent = `
        #tuto-phone { position: fixed; z-index: 2147483000; right: 36px; top: 50px; width: 380px; height: 780px;
            padding: 14px; border-radius: 46px; background: #111827; box-shadow: 0 24px 60px rgba(0,0,0,.35);
            transform: translateX(480px); transition: transform .5s ease; }
        #tuto-phone.on { transform: none; }
        #tuto-phone .tuto-glass { position: relative; width: 100%; height: 100%; border-radius: 32px; overflow: hidden; background: #fff; }
        #tuto-phone iframe { width: 100%; height: 100%; border: 0; display: block; }
        #tuto-phone .tuto-system { position: absolute; inset: 0; display: none; }
        #tuto-phone .tuto-system.on { display: flex; }
        #tuto-phone .tuto-tag { position: absolute; left: 12px; top: 10px; padding: 2px 9px; border-radius: 10px;
            background: rgba(0,0,0,.55); color: #fff; font: 500 12px system-ui, sans-serif; }
        #tuto-camera { flex-direction: column; align-items: center; justify-content: space-between; background: #000; padding: 46px 0 26px; }
        #tuto-camera img { width: 100%; flex: 1; min-height: 0; object-fit: contain; }
        #tuto-shutter { width: 68px; height: 68px; margin-top: 18px; border-radius: 50%; border: 5px solid #fff;
            background: #fff; box-shadow: inset 0 0 0 3px #000; cursor: pointer; }
        #tuto-camera.flash { animation: tuto-flash .35s ease-out; }
        @keyframes tuto-flash { from { filter: brightness(3) } to { filter: none } }
        #tuto-share { align-items: flex-end; background: rgba(0,0,0,.4); }
        #tuto-share .tuto-sheet { width: 100%; padding: 18px 16px 26px; border-radius: 22px 22px 0 0; background: #fff;
            font: 15px system-ui, sans-serif; color: #111827; }
        #tuto-share .tuto-file { padding: 10px 12px; border-radius: 10px; background: #f3f4f6; font-weight: 600; word-break: break-all; }
        #tuto-share .tuto-apps { display: flex; justify-content: space-around; margin-top: 18px; text-align: center; font-size: 13px; }
        #tuto-share .tuto-app { cursor: pointer; }
        #tuto-share .tuto-app i { display: block; width: 54px; height: 54px; margin: 0 auto 6px; border-radius: 50%; }
        #tuto-share .tuto-sent { display: none; margin-top: 16px; padding: 12px; border-radius: 10px; background: #e8f6ee;
            color: #146c2e; font-weight: 600; text-align: center; }`;
    document.documentElement.appendChild(style);
    const phone = document.createElement("div");
    phone.id = "tuto-phone";
    phone.innerHTML = `<div class="tuto-glass">
        <iframe id="tuto-phone-screen"></iframe>
        <div class="tuto-system" id="tuto-camera"><span class="tuto-tag">Illustration</span><img alt=""/><div id="tuto-shutter"></div></div>
        <div class="tuto-system" id="tuto-share"><span class="tuto-tag">Illustration</span><div class="tuto-sheet">
            <div class="tuto-file"></div>
            <div class="tuto-apps">
                <div class="tuto-app" id="tuto-whatsapp"><i style="background:#25d366"></i>WhatsApp</div>
                <div class="tuto-app"><i style="background:#2563eb"></i>E-mail</div>
                <div class="tuto-app"><i style="background:#6b7280"></i>Bluetooth</div>
            </div>
            <div class="tuto-sent">Envoyé sur WhatsApp</div>
        </div></div>
    </div>`;
    document.documentElement.appendChild(phone);
    // Over the phone's browser the frame draws its own cursor: park this one.
    phone.addEventListener("mouseenter", () => {
        document.getElementById("tuto-cursor").style.left = "-50px";
    });
    const system = (id, on) => phone.querySelector(id).classList.toggle("on", on);
    window.__phone = {
        open(url) {
            const frame = phone.querySelector("iframe");
            return new Promise((resolve) => {
                frame.onload = () => {
                    frame.contentDocument.addEventListener("mouseleave", () => {
                        frame.contentDocument.getElementById("tuto-cursor").style.left = "-50px";
                    });
                    resolve();
                };
                frame.src = url;
                phone.classList.add("on");
            });
        },
        close() {
            phone.classList.remove("on");
        },
        camera(src) {
            phone.querySelector("#tuto-camera img").src = src;
            system("#tuto-camera", true);
        },
        shoot() {
            const camera = phone.querySelector("#tuto-camera");
            camera.classList.add("flash");
            return new Promise((resolve) => setTimeout(() => {
                camera.classList.remove("flash");
                system("#tuto-camera", false);
                document.getElementById("tuto-cursor").style.left = "-50px";
                resolve();
            }, 450));
        },
        share(name) {
            phone.querySelector(".tuto-file").textContent = name;
            system("#tuto-share", true);
        },
        sent() {
            phone.querySelector(".tuto-apps").style.display = "none";
            phone.querySelector(".tuto-sent").style.display = "block";
        },
    };
};

async function openPhone(page, link) {
    await page.evaluate((url) => window.__phone.open(url), local(link));
    await pause(page, 1200);
}

async function run() {
    await makeSamples();
    resetWorkspace();
    const { page, context, finish, fastForward } = await startClip(DRY ? null : "7-du-papier-a-whatsapp", {
        storageState: AUTH, audio: true, voiceOver: DRY ? undefined : { language: "fr" },
    });
    // A desktop browser has no share sheet; the phone's is drawn instead.
    await context.addInitScript(() => {
        if (window.top !== window) {
            navigator.canShare = () => true;
            navigator.share = () => Promise.resolve();
        }
    });
    await openEditor(page);
    await page.evaluate(PHONE);
    await collapseCopilot(page);

    // Paper in
    await caption(page, "Un document papier, et seulement votre téléphone : commençons", 2500);
    await caption(page, "1. Cliquez sur Importer, puis sur « Avec mon téléphone »");
    const started = page.waitForResponse((r) => r.url().includes("/editor/capture/start"));
    await click(page, page.locator("#importRibbonBtn"), { after: 300 });
    await click(page, page.locator(".rb-menu button", { hasText: "Avec mon téléphone" }), { after: 300 });
    const capture = await (await started).json();
    const qr = page.locator(".sa-capture-qr");
    await qr.waitFor();
    await highlight(page, qr);
    await caption(page, "2. Scannez ce QR code avec l'appareil photo de votre téléphone", 3000);
    await highlight(page, null);
    await openPhone(page, capture.link);
    await caption(page, "La page de capture s'ouvre sur le téléphone");
    const chooser = page.waitForEvent("filechooser");
    await click(page, screen(page).locator("#add"), { after: 300 });
    const photo = `data:image/jpeg;base64,${fs.readFileSync(PHOTO_JPG).toString("base64")}`;
    await page.evaluate((src) => window.__phone.camera(src), photo);
    await caption(page, "3. Posez le document à plat et prenez-le en photo", 2500);
    await click(page, page.locator("#tuto-shutter"), { after: 100 });
    await page.evaluate(() => window.__phone.shoot());
    await (await chooser).setFiles(PHOTO_JPG);
    await screen(page).locator(".page").first().waitFor();
    await pause(page, 800);
    await caption(page, "Ajoutez d'autres pages si besoin, depuis l'appareil photo ou la galerie", 3000);
    await caption(page, "4. Touchez Envoyer : la page part dans l'éditeur");
    await click(page, screen(page).locator("#send"), { after: 300 });
    await screen(page).locator(".msg.ok").waitFor({ timeout: 30000 });
    await page.locator(".sa-surface-view iframe, .sa-surface-view img").first().waitFor({ timeout: 30000 });
    await pause(page, 1500);
    await page.evaluate(() => window.__phone.close());
    await pause(page, 800);

    // Extraction and a small change
    await caption(page, "5. Sur l'ordinateur, cliquez sur Modifier pour extraire le texte");
    await click(page, page.getByTitle("Modifier", { exact: true }), { after: 300 });
    await caption(page, "L'éditeur annonce le nombre de pages et le prix : cliquez sur Extraire");
    await click(page, page.locator(".modal-content").getByRole("button", { name: "Extraire" }), { after: 300 });
    await caption(page, "⏳ L'IA lit la photo, tableau compris (vidéo accélérée)");
    fastForward(8);
    const text = page.locator(".sa-doc-editable .ProseMirror");
    const ready = text.filter({ hasText: "678" });
    // Keeping the stamp as an image is a paid extra: declined here.
    const decline = page.locator(".modal-content").getByRole("button", { name: "Non merci" });
    await ready.or(decline).first().waitFor({ timeout: 300000 });
    fastForward();
    if (await decline.isVisible()) {
        await caption(page, "Conserver le cachet comme image est un supplément : ici, nous répondons « Non merci »", 3500);
        await click(page, decline, { after: 300 });
        await ready.waitFor({ timeout: 300000 });
    }
    await pause(page, 1000);
    if (DRY) {
        console.log(await text.innerText());
        await page.screenshot({ path: "/tmp/tuto-dry-extracted.png" });
    }
    await caption(page, "6. Le texte est modifiable : ici, la validité passe de 30 à 15 jours", 2500);
    await edit(page, text);

    // Document out
    await caption(page, "7. Passez en Aperçu, puis cliquez sur Exporter");
    await click(page, page.getByTitle("Aperçu", { exact: true }), { after: 300 });
    await page.getByTitle("Modifier", { exact: true }).waitFor({ timeout: 120000 });
    await page.locator(".sa-surface-view iframe, .sa-surface-view img").first().waitFor({ timeout: 30000 });
    await pause(page, 2500);
    await click(page, page.locator("#exportRibbonBtn"), { after: 500 });
    const sending = page.waitForResponse((r) => r.url().includes("/send-to-phone"));
    await caption(page, "Choisissez « Envoyer sur mon téléphone »");
    await click(page, page.locator(".rb-menu").getByRole("button", { name: "Envoyer sur mon téléphone" }), { after: 300 });
    const transfer = await (await sending).json();
    const code = page.locator(".sa-capture-qr");
    await code.waitFor();
    await highlight(page, code);
    await caption(page, "8. Scannez ce nouveau QR code avec votre téléphone", 3000);
    await highlight(page, null);
    await openPhone(page, transfer.link);
    await caption(page, "Le document est sur le téléphone : téléchargez-le ou partagez-le", 3000);
    const name = await screen(page).locator(".name").innerText();
    await caption(page, "9. Touchez Partager, puis choisissez WhatsApp");
    await click(page, screen(page).locator("#share"), { after: 500 });
    await page.evaluate((file) => window.__phone.share(file), name);
    await pause(page, 1200);
    await click(page, page.locator("#tuto-whatsapp"), { after: 300 });
    await page.evaluate(() => window.__phone.sent());
    if (!DRY) {
        await screenshot(page, "7-du-papier-a-whatsapp");
    }
    await caption(page, "✅ Du papier à WhatsApp, sans scanner ni câble", 3500);
    await caption(page, null, 400);
    await finish({ trimStart: 0.5 });
}

/** Changes the quote's validity from 30 to 15 days. */
async function edit(page, text) {
    const line = text.locator("p, li, td").filter({ hasText: /30\s*jours/ }).last();
    await line.scrollIntoViewIfNeeded();
    await highlight(page, line);
    await pause(page, 1200);
    await highlight(page, null);
    // Select "30" by double-clicking it, then type over it.
    const box = await line.evaluate((el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
            const at = node.textContent.search(/30\s*jours/);
            if (at >= 0) {
                const range = document.createRange();
                range.setStart(node, at);
                range.setEnd(node, at + 2);
                const r = range.getBoundingClientRect();
                return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
            }
        }
        return null;
    });
    await page.mouse.move(box.x, box.y, { steps: 28 });
    await page.evaluate(([x, y]) => window.__tuto?.ring(x, y), [box.x, box.y]);
    await page.mouse.dblclick(box.x, box.y);
    await pause(page, 500);
    await page.keyboard.type("15", { delay: 180 });
    await pause(page, 1200);
}

await run();
