// Partie 5 : Aperçu et export. Run with `node part5-apercu.mjs [clip...]`,
// after part4 (it reuses the extracted quote photo from the demo workspace).
import { caption, click, highlight, pause, screenshot, startClip } from "./lib.mjs";
import { AUTH, LETTER_HTML, collapseCopilot, openDocument, openEditor, seedDocument } from "./demo.mjs";

// Visible browser: headless Chrome doesn't render the PDF viewer in the page.
const HEADED = { storageState: AUTH, audio: true };
const QUOTE = "devis-photo.jpg";

const previewFrame = (page) => page.locator(".sa-surface-view iframe, .sa-surface-view img").first();
const renderMode = (page, label) => page.locator(".status-render-mode-option").filter({ hasText: label });

async function toPreview(page) {
    await click(page, page.getByTitle("Aperçu", { exact: true }), { after: 300 });
    await page.getByTitle("Modifier", { exact: true }).waitFor({ timeout: 120000 });
    await previewFrame(page).waitFor({ timeout: 30000 });
    await pause(page, 2500);
}

/** Opens the extracted text (free: the extraction is cached). */
async function toText(page) {
    const edit = page.getByTitle("Modifier", { exact: true });
    if (await edit.isVisible()) {
        await click(page, edit, { after: 300 });
    }
    await page.locator(".sa-doc-editable").waitFor({ timeout: 60000 });
    await pause(page, 800);
}

async function openExportMenu(page) {
    await click(page, page.locator("#exportRibbonBtn"), { after: 500 });
    return page.locator(".rb-menu");
}

const clips = {
    // 5.1 Passer en Aperçu
    async apercu() {
        seedDocument("Démarches", "Demande d'acte de naissance", LETTER_HTML);
        const { page, finish } = await startClip("5-1-apercu", HEADED);
        await openEditor(page);
        await collapseCopilot(page);
        await openDocument(page, "Demande d'acte de naissance", "Démarches");
        await caption(page, "Pour voir le document tel qu'il sera imprimé, cliquez sur Aperçu");
        await toPreview(page);
        await caption(page, "L'aperçu montre la page finale, prête à exporter", 3000);
        await caption(page, "Cliquez sur Modifier pour reprendre la rédaction");
        await click(page, page.getByTitle("Modifier", { exact: true }), { after: 1500 });
        await caption(page, null, 400);
        await finish({ trimStart: 0.5 });
    },

    // 5.2 Les deux vues : Original et PDF
    async vues() {
        const { page, finish } = await startClip("5-2-original-et-pdf", HEADED);
        await openEditor(page);
        await collapseCopilot(page);
        await openDocument(page, QUOTE);
        await toText(page);
        await caption(page, "Un document importé, puis extrait : passez en Aperçu");
        await toPreview(page);
        await highlight(page, page.locator(".status-render-mode-option").first().locator(".."));
        await caption(page, "« PDF » montre votre version, « Original » le document importé", 3000);
        await highlight(page, null);
        await click(page, renderMode(page, "Original"), { after: 2500 });
        await caption(page, "Comparez les deux pour vérifier l'extraction", 2500);
        await click(page, renderMode(page, "PDF"), { after: 2500 });
        await caption(page, null, 400);
        await finish({ trimStart: 0.5 });
    },

    // 5.3 Exporter
    async exporter() {
        seedDocument("Démarches", "Demande d'acte de naissance", LETTER_HTML);
        const { page, finish } = await startClip("5-3-exporter", HEADED);
        await openEditor(page);
        await collapseCopilot(page);
        await openDocument(page, "Demande d'acte de naissance", "Démarches");
        await caption(page, "En mode Aperçu, cliquez sur Exporter");
        await toPreview(page);
        const menu = await openExportMenu(page);
        await highlight(page, menu);
        await caption(page, "PDF ou image, identiques à l'aperçu, ou envoi sur le téléphone", 3000);
        await screenshot(page, "5-3-exporter-apercu");
        await highlight(page, null);
        const [download] = await Promise.all([
            page.waitForEvent("download"),
            click(page, menu.getByRole("button", { name: "PDF (.pdf)" }), { after: 300 }),
        ]);
        await download.cancel();
        await caption(page, "✅ Le PDF est téléchargé", 2200);
        await caption(page, "Pour un fichier Word, revenez en mode Modifier");
        await click(page, page.getByTitle("Modifier", { exact: true }), { after: 1200 });
        const editMenu = await openExportMenu(page);
        await highlight(page, editMenu);
        await caption(page, "En mode Modifier, seul Word (.docx) est proposé", 3000);
        await screenshot(page, "5-3-exporter-modifier");
        await highlight(page, null);
        await page.keyboard.press("Escape");
        await page.mouse.click(700, 500);
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
