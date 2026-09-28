// Partie 4 : Importer et extraire. Run with `node part4-importer.mjs [clip...]`.
import { caption, click, highlight, pause, startClip } from "./lib.mjs";
import { AUTH, collapseCopilot, openEditor, resetWorkspace } from "./demo.mjs";
import { INVOICE_PDF, PHOTO_JPG, SCAN_PDF, makeSamples } from "./samples.mjs";

// Visible browser: headless Chrome doesn't render the PDF viewer in the page.
const HEADED = { storageState: AUTH, audio: true };

async function importFile(page, file) {
    const [chooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        click(page, page.locator("#importRibbonBtn"), { after: 300 }),
    ]);
    await chooser.setFiles(file);
    await page.locator(".sa-surface-view iframe, .sa-surface-view img").first().waitFor({ timeout: 30000 });
    await pause(page, 2500);
}

const editButton = (page) => page.getByTitle("Modifier", { exact: true });

const clips = {
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
