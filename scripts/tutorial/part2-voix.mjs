// Partie 2 : Écrire et relire à la voix. Run with `node part2-voix.mjs [clip...]`.
import { SILENT_TTS, caption, click, highlight, pause, playIntoMic, soynadeVoice, startClip, withVirtualMic } from "./lib.mjs";
import { AUTH, LETTER_HTML, openDocument, openEditor, resetWorkspace, seedDocument } from "./demo.mjs";

const FOLDER = "Démarches";
const DOC = "Demande d'acte de naissance";
const DICTATED = "Vous trouverez ci-joint une copie de ma carte nationale d'identité.";

const paragraph = (page, text) => page.locator(".ProseMirror p").filter({ hasText: text }).first();

const clips = {
    // 2.1 Dicter
    async dicter() {
        const wav = soynadeVoice("dictee-carte-identite", DICTATED);
        resetWorkspace();
        seedDocument(FOLDER, DOC, LETTER_HTML);
        await withVirtualMic(async (micEnv) => {
            const { page, finish } = await startClip("2-1-dicter", { storageState: AUTH, env: micEnv, audio: true });
            await openEditor(page);
            await openDocument(page, DOC, FOLDER);
            const target = paragraph(page, "passeport");
            await caption(page, "Cliquez à l'endroit où le texte doit apparaître");
            await click(page, target, { after: 200 });
            await page.keyboard.press("End");
            await pause(page, 600);
            await caption(page, "Cliquez sur Dicter, puis parlez");
            await click(page, page.getByTitle("Dicter (une phrase)"), { after: 600 });
            await caption(page, "🎙️ « Vous trouverez ci-joint une copie de ma carte nationale d'identité. »");
            await playIntoMic(wav);
            await target.filter({ hasText: "identité" }).waitFor({ timeout: 20000 });
            await caption(page, "Le texte s'écrit à la position du curseur");
            await page.getByTitle("Dicter (une phrase)").waitFor({ timeout: 15000 });
            await caption(page, "Après quelques secondes de silence, la dictée s'arrête d'elle-même", 2500);
            await highlight(page, target);
            await caption(page, "Relisez : ajoutez si besoin majuscules et ponctuation", 3000);
            await highlight(page, null);
            await caption(page, null, 400);
            await finish({ trimStart: 0.5 });
        });
    },

    // 2.2 Lire à voix haute
    async "lire-a-voix-haute"() {
        const { page, context, finish } = await startClip("2-2-lire-a-voix-haute", { storageState: AUTH });
        await context.addInitScript(SILENT_TTS);
        await openEditor(page);
        await openDocument(page, DOC, FOLDER);
        const target = paragraph(page, "Je vous prie de bien vouloir");
        await caption(page, "Sélectionnez un passage (ici, un triple-clic sur le paragraphe)");
        await target.click({ clickCount: 3 });
        await pause(page, 900);
        await caption(page, "Cliquez sur Lire à voix haute");
        await click(page, page.getByTitle("Lire à voix haute"), { after: 300 });
        await caption(page, "🔊 Chaque mot est surligné pendant la lecture");
        await page.locator(".rb-btn.on[title='Lire à voix haute']").waitFor({ state: "detached", timeout: 30000 });
        await caption(page, "La lecture s'arrête à la fin de la sélection, qui est rétablie", 2500);
        await caption(page, "Sans sélection, la lecture part du curseur jusqu'à la fin du document", 3000);
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
