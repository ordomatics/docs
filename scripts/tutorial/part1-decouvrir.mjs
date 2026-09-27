// Partie 1 : Découvrir l'éditeur. Run with `node part1-decouvrir.mjs [clip...]`.
import { annotate, caption, click, pause, screenshot, startClip } from "./lib.mjs";
import { AUTH, LETTER_HTML, openDocument, openEditor, resetWorkspace, seedDocument } from "./demo.mjs";

const FOLDER = "Démarches";
const DOC = "Demande d'acte de naissance";

async function renameTo(page, name) {
    const input = page.locator("#filesPanel input:not([type=file])");
    await input.waitFor();
    await page.keyboard.press("Control+A");
    await page.keyboard.type(name, { delay: 60 });
    await pause(page, 300);
    await page.keyboard.press("Enter");
    await pause(page, 900);
}

const clips = {
    // 1.2 Dossiers et documents
    async "dossiers-et-documents"() {
        resetWorkspace();
        const { page, finish } = await startClip("1-2-dossiers-et-documents", { storageState: AUTH });
        await openEditor(page);
        await caption(page, "Créez un dossier pour ranger vos documents");
        await click(page, page.getByTitle("Nouveau dossier"));
        await caption(page, "Donnez-lui un nom, puis appuyez sur Entrée");
        await renameTo(page, FOLDER);
        await caption(page, "Sélectionnez le dossier, puis créez un document");
        await click(page, page.locator(".file-item").filter({ hasText: FOLDER }).first());
        await click(page, page.getByTitle("Nouveau fichier"));
        await caption(page, "Nommez le document : il s'ouvre aussitôt dans l'éditeur");
        await renameTo(page, DOC);
        await pause(page, 1200);
        const row = page.locator(".file-item").filter({ hasText: DOC }).first();
        await caption(page, "Survolez un document pour le renommer ou le supprimer");
        await row.hover();
        await pause(page, 400);
        await click(page, row.getByTitle("Renommer"));
        await renameTo(page, "Demande d'acte de naissance - Aminata");
        const renamed = page.locator(".file-item").filter({ hasText: "Aminata" }).first();
        await renamed.hover();
        await pause(page, 400);
        await click(page, renamed.getByTitle("Supprimer"));
        await caption(page, "La suppression demande une confirmation : elle est définitive", 2200);
        await click(page, page.locator(".modal-footer").getByRole("button", { name: "Annuler" }));
        await caption(page, null, 400);
        await finish({ trimStart: 0.5 });
    },

    // 1.1 Tour de l'écran
    async "tour"() {
        resetWorkspace();
        seedDocument(FOLDER, DOC, LETTER_HTML);
        const { page, finish } = await startClip(null, { storageState: AUTH, viewport: { width: 1600, height: 940 } });
        await openEditor(page);
        await openDocument(page, DOC, FOLDER);
        await page.mouse.move(0, 450);
        await annotate(page, [
            [page.locator("#filesPanel"), 1],
            [[page.locator("#newRibbonBtn"), page.locator("#exportRibbonBtn")], 2],
            [[page.locator("#ribbonToolbar button").first(), page.locator("#ribbonToolbar button").last()], 3],
            [page.locator(".doc-scroll"), 4],
            [page.locator("#statusBar"), 5],
            [page.locator("#assistantPanel"), 6],
            [[page.locator("#toggleFiles"), page.locator("#toggleAccount")], 7],
        ]);
        await screenshot(page, "1-1-tour-de-l-ecran");
        await finish();
    },
};

const wanted = process.argv.slice(2);
for (const [name, run] of Object.entries(clips)) {
    if (!wanted.length || wanted.includes(name)) {
        console.log(`▶ ${name}`);
        await run();
    }
}
