// Partie 6 : Scénario complet — one story through the whole editor.
import {
    LANG, SILENT_TTS, caption, click, devEnv, highlight, pause, playIntoMic, prependIntro, soynadeVoice, startClip, type,
    withVirtualMic, wolofLine,
} from "./lib.mjs";
import { collapseCopilot, openEditor, resetWorkspace } from "./demo.mjs";
import { SCAN_PDF, makeSamples } from "./samples.mjs";
import { fileURLToPath } from "node:url";

const env = devEnv();
const DICTATED = "Une collation sera offerte à l'issue de l'assemblée.";
// What the Wolof voice-over says where a caption's own wording doesn't
// translate (checked against Soynade: these do).
export const VOICE_SAY = {
    "1. Connectez-vous depuis « Mon compte »": "1. Connectez-vous à votre compte",
    "2. Importez la convocation scannée de l'an dernier": "2. Importez le courrier scanné",
    "… et cliquez sur Modifier pour en extraire le texte (attente accélérée)": "Cliquez sur Modifier pour lire le texte",
    "3. Cliquez à la fin d'un paragraphe et dictez un ajout": "3. Ajoutez une phrase avec votre voix",
    "Faites défiler le document importé, tel quel": "Regardez tout le document",
    "4. Sélectionnez le paragraphe dicté et corrigez-le avec Régénérer": "4. Corrigez le texte avec Régénérer",
    "6. Sélectionnez le paragraphe et faites-le lire à voix haute": "6. Sélectionnez le paragraphe et écoutez-le",
    "7. Passez en Aperçu, puis exportez le PDF": "7. Ouvrez l'aperçu, puis téléchargez le PDF",
    "✅ La nouvelle convocation est prête à être imprimée ou envoyée": "C'est terminé, le document est prêt",
};
// Title card spoken in Wolof before the scenario.
const INTRO = {
    voice: "Salam aleykum, aujourd'hui nous allons vous montrer comment fonctionne notre éditeur Smartacus",
    fr: {
        title: "Éditeur Smartacus",
        subtitle: "Salam aleykum ! Aujourd'hui, nous vous montrons comment fonctionne notre éditeur Smartacus.",
        note: "🔊 Voix off en wolof",
    },
    en: {
        title: "Smartacus editor",
        subtitle: "Salam aleykum! Today we'll show you how our Smartacus editor works.",
        note: "🔊 Wolof voice-over",
    },
};

export async function addIntro(clipFile) {
    await prependIntro(clipFile, { ...INTRO[LANG], voice: wolofLine(INTRO.voice) });
}

/** Collapses Copilot and the files panel: the document gets the full width. */
async function focusDocument(page) {
    await collapseCopilot(page);
    // A collapsed files panel still counts as "visible"; the toggle's "on" state doesn't lie.
    if (await page.locator("#toggleFiles.on").count()) {
        await click(page, page.locator("#toggleFiles"), { after: 600 });
    }
}

/** Scrolls the imported PDF down to its end and back to the top. */
async function browseDocument(page) {
    const view = page.locator(".sa-surface-view").first();
    const box = await view.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
    for (let i = 0; i < 12; i++) {
        await page.mouse.wheel(0, 260);
        await pause(page, 320);
    }
    await pause(page, 900);
    for (let i = 0; i < 6; i++) {
        await page.mouse.wheel(0, -560);
        await pause(page, 220);
    }
    await pause(page, 700);
}

const paragraph = (page, text) => page.locator(".ProseMirror p").filter({ hasText: text }).first();

async function run() {
    await makeSamples();
    resetWorkspace();
    const wav = soynadeVoice("dictee-collation", DICTATED);
    await withVirtualMic(async (micEnv) => {
        // Wolof voice-over; the dictation step plays the French sentence being dictated.
        const clip = await startClip("6-scenario-complet", {
            env: micEnv, audio: true, voiceOver: { say: VOICE_SAY, overrides: { [`🎙️ « ${DICTATED} »`]: wav } },
        });
        const { page, context, finish, fastForward } = clip;
        await context.addInitScript(SILENT_TTS);
        await openEditor(page);

        // 1. Se connecter
        await caption(page, "1. Connectez-vous depuis « Mon compte »");
        await click(page, page.locator("#toggleAccount"));
        await click(page, page.locator("#openLoginBtn"));
        const dialog = page.locator(".sa-auth-dialog");
        await type(page, dialog.getByPlaceholder("Adresse e-mail"), env.TUTORIAL_DEMO_EMAIL, { delay: 35 });
        await type(page, dialog.getByPlaceholder("Mot de passe"), env.TUTORIAL_DEMO_PASSWORD, { delay: 25 });
        await click(page, dialog.locator("button.sa-auth-primary"), { after: 300 });
        await dialog.waitFor({ state: "detached", timeout: 30000 });
        await pause(page, 1200);
        if (await page.locator(".credit-card-info").isVisible()) {
            await click(page, page.locator("#toggleAccount"), { after: 500 });
        }

        // 2. Importer le courrier scanné, le parcourir, puis extraire son texte
        await focusDocument(page);
        await caption(page, "2. Importez la convocation scannée de l'an dernier");
        const [chooser] = await Promise.all([
            page.waitForEvent("filechooser"),
            click(page, page.locator("#importRibbonBtn"), { after: 300 }),
        ]);
        await chooser.setFiles(SCAN_PDF);
        await page.locator(".sa-surface-view iframe, .sa-surface-view img").first().waitFor({ timeout: 30000 });
        await pause(page, 2000);
        await caption(page, "Faites défiler le document importé, tel quel");
        await browseDocument(page);
        await caption(page, "… et cliquez sur Modifier pour en extraire le texte (attente accélérée)");
        await click(page, page.getByTitle("Modifier", { exact: true }), { after: 300 });
        await click(page, page.locator(".modal-content").getByRole("button", { name: "Extraire" }), { after: 300 });
        fastForward(8);
        await page.locator(".sa-doc-editable .ProseMirror").filter({ hasText: "Ibrahima Ba" }).waitFor({ timeout: 300000 });
        fastForward();
        await pause(page, 1200);

        // 3. Dicter un ajout
        const presence = paragraph(page, "Votre présence est importante");
        await caption(page, "3. Cliquez à la fin d'un paragraphe et dictez un ajout");
        await click(page, presence, { after: 200 });
        await page.keyboard.press("End");
        await click(page, page.getByTitle("Dicter (une phrase)"), { after: 600 });
        await caption(page, `🎙️ « ${DICTATED} »`);
        await playIntoMic(wav);
        await presence.filter({ hasText: /collation/i }).waitFor({ timeout: 20000 });
        await page.getByTitle("Dicter (une phrase)").waitFor({ timeout: 15000 });
        await pause(page, 800);

        // 4. Corriger la transcription avec Régénérer
        await caption(page, "4. Sélectionnez le paragraphe dicté et corrigez-le avec Régénérer");
        await presence.click({ clickCount: 3 });
        await pause(page, 600);
        const regenerate = page.locator("#regenerateBtn");
        await click(page, regenerate, { after: 300 });
        await page.locator("#regenerateBtn[disabled]").waitFor({ timeout: 10000 }).catch(() => {});
        await page.locator("#regenerateBtn:not([disabled])").waitFor({ timeout: 120000 });
        await pause(page, 600);
        await highlight(page, presence);
        await pause(page, 2200);
        await highlight(page, null);

        // 5. Faire modifier la date par Copilot
        await click(page, page.locator("#toggleAssistant"), { after: 700 });
        await caption(page, "5. Demandez à Copilot de changer la date de l'assemblée");
        await type(page, page.getByPlaceholder("Demander à Copilot..."),
            "Remplace la date de l'assemblée par le samedi 10 octobre 2026 à 9 heures.", { delay: 25 });
        await click(page, page.getByTitle("Envoyer"), { after: 300 });
        fastForward(6);
        await paragraph(page, "10 octobre").waitFor({ timeout: 240000 });
        await page.locator(".copilot-input textarea:not([disabled])").waitFor({ timeout: 240000 });
        fastForward();
        const dated = paragraph(page, "10 octobre");
        await dated.scrollIntoViewIfNeeded();
        await highlight(page, dated);
        await pause(page, 2200);
        await highlight(page, null);

        // 6. Écouter le paragraphe modifié
        await caption(page, "6. Sélectionnez le paragraphe et faites-le lire à voix haute");
        await dated.click({ clickCount: 3 });
        await pause(page, 500);
        await click(page, page.getByTitle("Lire à voix haute"), { after: 300 });
        await page.locator(".rb-btn.on[title='Lire à voix haute']").waitFor({ state: "detached", timeout: 60000 });
        await pause(page, 600);

        // 7. Aperçu et export
        await caption(page, "7. Passez en Aperçu, puis exportez le PDF");
        await focusDocument(page);
        await click(page, page.getByTitle("Aperçu", { exact: true }), { after: 300 });
        await page.getByTitle("Modifier", { exact: true }).waitFor({ timeout: 120000 });
        await pause(page, 2500);
        const [download] = await Promise.all([
            page.waitForEvent("download"),
            click(page, page.locator("#exportRibbonBtn"), { after: 300 }),
        ]);
        await download.cancel();
        await caption(page, "✅ La nouvelle convocation est prête à être imprimée ou envoyée", 3500);
        await caption(page, null, 400);
        await addIntro(await finish({ trimStart: 0.5 }));
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    await run();
}
