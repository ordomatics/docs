// Partie 4 : Importer et extraire. Run with `node part4-importer.mjs [clip...]`.
import { chromium, devices } from "playwright";
import { BASE_URL, caption, click, highlight, pause, screenshot, startClip } from "./lib.mjs";
import { AUTH, collapseCopilot, openEditor, resetWorkspace } from "./demo.mjs";
import { INVOICE_PDF, PHOTO_JPG, SCAN_PDF, WORD_DOCX, makeSamples } from "./samples.mjs";

// Visible browser: headless Chrome doesn't render the PDF viewer in the page.
const HEADED = { storageState: AUTH, audio: true };

async function importFile(page, file) {
    const [chooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        click(page, page.locator("#importRibbonBtn"), { after: 300 }).then(() =>
            click(page, page.locator(".rb-menu button", { hasText: "Depuis l'ordinateur" }), { after: 300 })),
    ]);
    await chooser.setFiles(file);
    await page.locator(".sa-surface-view iframe, .sa-surface-view img").first().waitFor({ timeout: 30000 });
    await pause(page, 2500);
}

async function confirmExtraction(page) {
    await caption(page, "L'éditeur annonce le nombre de pages et le prix : cliquez sur Extraire");
    await click(page, page.locator(".modal-content").getByRole("button", { name: "Extraire" }), { after: 300 });
}

const editButton = (page) => page.getByTitle("Modifier", { exact: true });

const clips = {
    // 4.1 : photographier avec son téléphone (captures d'écran)
    async telephone() {
        await makeSamples();
        resetWorkspace();
        const browser = await chromium.launch({ channel: "chrome" });
        const laptop = await (await browser.newContext({ storageState: AUTH, viewport: { width: 1400, height: 900 } })).newPage();
        await openEditor(laptop);
        const started = laptop.waitForResponse((r) => r.url().includes("/editor/capture/start"));
        await laptop.locator("#importRibbonBtn").click();
        await laptop.locator(".rb-menu button", { hasText: "Avec mon téléphone" }).click();
        const { link } = await (await started).json();
        await laptop.locator(".sa-capture-qr").waitFor();
        const dialog = await laptop.locator(".modal-content").boundingBox();
        await screenshot(laptop, "4-1-telephone-qr", { clip: dialog });
        // Short screen: the pages and the buttons in one compact picture.
        const phone = await (await browser.newContext({ ...devices["Pixel 7"], viewport: { width: 412, height: 620 } })).newPage();
        await phone.goto(link.replace(/^https?:\/\/[^/]+/, BASE_URL));
        await phone.locator("#picker").setInputFiles(PHOTO_JPG);
        await phone.locator("#picker").setInputFiles(PHOTO_JPG);
        await screenshot(phone, "4-1-telephone-pages");
        await browser.close();
    },

    // 4.1 + 4.2 : un PDF qui contient du texte
    async "pdf-texte"() {
        await makeSamples();
        resetWorkspace();
        const { page, finish } = await startClip("4-1-importer-un-pdf", HEADED);
        await openEditor(page);
        await collapseCopilot(page);
        await caption(page, "Cliquez sur Importer et choisissez un PDF, un scan ou une photo");
        await importFile(page, INVOICE_PDF);
        await caption(page, "Le document s'ouvre tel quel, dans sa vue d'origine", 2500);
        await caption(page, "Pour modifier son texte, cliquez sur Modifier");
        await click(page, editButton(page), { after: 300 });
        await page.locator(".sa-doc-editable .ProseMirror").filter({ hasText: "440 000" }).waitFor({ timeout: 60000 });
        await pause(page, 800);
        await highlight(page, page.locator(".sa-doc-editable"));
        await caption(page, "Ce PDF contient déjà du texte : il est extrait aussitôt, gratuitement", 3500);
        await highlight(page, null);
        await caption(page, null, 400);
        await finish({ trimStart: 0.5 });
    },

    // 4.1 : un document Word
    async "word"() {
        await makeSamples();
        resetWorkspace();
        const { page, finish } = await startClip("4-4-importer-un-word", HEADED);
        await openEditor(page);
        await collapseCopilot(page);
        await caption(page, "Cliquez sur Importer et choisissez un fichier Word (.docx)");
        const [chooser] = await Promise.all([
            page.waitForEvent("filechooser"),
            click(page, page.locator("#importRibbonBtn"), { after: 300 }).then(() =>
                click(page, page.locator(".rb-menu button", { hasText: "Depuis l'ordinateur" }), { after: 300 })),
        ]);
        await chooser.setFiles(WORD_DOCX);
        await page.locator(".sa-doc-editable .ProseMirror").filter({ hasText: "7 500" }).waitFor({ timeout: 60000 });
        await pause(page, 800);
        await highlight(page, page.locator(".sa-doc-editable"));
        await caption(page, "Le document est converti aussitôt, gratuitement, et s'ouvre prêt à modifier", 3500);
        await highlight(page, null);
        const table = page.locator(".sa-doc-editable table").first();
        await table.scrollIntoViewIfNeeded();
        await highlight(page, table);
        await caption(page, "Titres, listes, gras et tableau sont conservés", 3500);
        await highlight(page, null);
        await caption(page, null, 400);
        await finish({ trimStart: 0.5 });
    },

    // 4.2 : un document scanné
    async "scan"() {
        await makeSamples();
        resetWorkspace();
        const { page, finish, fastForward } = await startClip("4-2-extraire-un-scan", HEADED);
        await openEditor(page);
        await collapseCopilot(page);
        await caption(page, "Un courrier scanné : ce n'est qu'une image, sans texte à copier");
        await importFile(page, SCAN_PDF);
        await caption(page, "Cliquez sur Modifier pour en extraire le texte");
        await click(page, editButton(page), { after: 300 });
        await confirmExtraction(page);
        await caption(page, "L'IA lit chaque page : la progression s'affiche en bas de l'écran");
        await highlight(page, page.locator("#statusBar"));
        await pause(page, 2500);
        fastForward(6);
        await page.locator(".sa-doc-editable .ProseMirror").filter({ hasText: "Ibrahima Ba" }).waitFor({ timeout: 300000 });
        fastForward();
        await highlight(page, null);
        await pause(page, 800);
        await caption(page, "Le texte est prêt à être modifié, avec sa mise en forme", 3000);
        await page.locator(".doc-scroll").hover();
        for (let i = 0; i < 5; i++) {
            await page.mouse.wheel(0, 260);
            await pause(page, 650);
        }
        await caption(page, null, 400);
        await finish({ trimStart: 0.5 });
    },
    // 4.2 : une photo prise au téléphone
    async "photo"() {
        await makeSamples();
        resetWorkspace();
        const { page, finish, fastForward } = await startClip("4-3-extraire-une-photo", HEADED);
        await openEditor(page);
        await collapseCopilot(page);
        await caption(page, "Une photo prise au téléphone s'importe de la même façon");
        await importFile(page, PHOTO_JPG);
        await caption(page, "Cliquez sur Modifier pour en extraire le texte");
        await click(page, editButton(page), { after: 300 });
        await confirmExtraction(page);
        await caption(page, "⏳ L'IA lit la photo, tableau compris (vidéo accélérée)");
        fastForward(8);
        await page.locator(".sa-doc-editable .ProseMirror").filter({ hasText: "678" }).waitFor({ timeout: 300000 });
        fastForward();
        await pause(page, 800);
        const table = page.locator(".sa-doc-editable table").first();
        await table.scrollIntoViewIfNeeded();
        await highlight(page, table);
        await caption(page, "Le tableau est reconstitué : vérifiez chaque montant sur le papier", 4000);
        await highlight(page, null);
        await caption(page, null, 400);
        await finish({ trimStart: 0.5 });
    },
};

const wanted = process.argv.slice(2);
for (const [name, run] of Object.entries(clips)) {
    if (!wanted.length || wanted.includes(name)) {
        console.log(`▶ ${name}`);
        await run();
    }
}
