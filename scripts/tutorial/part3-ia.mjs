// Partie 3 : Réécrire avec l'IA. Run with `node part3-ia.mjs [clip...]`.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { caption, click, highlight, pause, playIntoMic, soynadeVoice, startClip, type, withVirtualMic } from "./lib.mjs";
import { AUTH, LETTER_HTML, openDocument, openEditor, resetWorkspace, seedDocument } from "./demo.mjs";

const FOLDER = "Démarches";
const DOC = "Demande d'acte de naissance";
const DICTATED = "vous trouverez ci-joint une copie de ma carte nationale d'identité";
// The letter as Partie 2 left it: a dictated sentence without capital or full stop.
const LETTER_AFTER_DICTATION = LETTER_HTML.replace("dossier de passeport.</p>", `dossier de passeport. ${DICTATED}</p>`);

const paragraph = (page, text) => page.locator(".ProseMirror p").filter({ hasText: text }).first();
const copilotInput = (page) => page.getByPlaceholder("Demander à Copilot...");

/** Waits for Copilot to finish answering (its input is enabled again). */
async function waitForCopilot(page, timeout = 180000) {
    await page.waitForTimeout(1500);
    await page.locator(".copilot-input textarea:not([disabled])").waitFor({ timeout });
    await pause(page, 1200);
}

// Two complainants at a gendarmerie brigade, in Wolof (translated from this
// French script by Soynade); the second voice is pitch-shifted so the two
// speakers are distinguishable.
const HEARING = [
    "Je m'appelle Moussa Diop. Je vends du riz au marché de Thiaroye. Cette nuit, des voleurs ont cassé "
    + "la porte de ma boutique et ont pris trois sacs de riz.",
    "Je m'appelle Fatou Sarr. Ma boutique est à côté. Ils ont aussi cassé ma porte et volé quarante mille "
    + "francs. Le gardien a vu deux jeunes sur une moto.",
];

function hearingRecording() {
    const out = path.join(path.dirname(soynadeVoice("audition-1", HEARING[0], "wo", "fr")), "audition-marche-thiaroye.mp3");
    if (fs.existsSync(out)) {
        return out;
    }
    const first = soynadeVoice("audition-1", HEARING[0], "wo", "fr");
    const second = soynadeVoice("audition-2", HEARING[1], "wo", "fr");
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", first, "-i", second, "-filter_complex",
        "[1:a]asetrate=48000*1.2,aresample=48000,atempo=0.8333[b];[0:a][b]concat=n=2:v=0:a=1",
        "-ac", "1", "-b:a", "64k", out]);
    return out;
}

const clips = {
    // 3.1 Régénérer un passage
    async regenerer() {
        resetWorkspace();
        seedDocument(FOLDER, DOC, LETTER_AFTER_DICTATION);
        const { page, finish } = await startClip("3-1-regenerer", { storageState: AUTH });
        await openEditor(page);
        await openDocument(page, DOC, FOLDER);
        const target = paragraph(page, "passeport");
        await caption(page, "Sélectionnez le passage à corriger ou à améliorer");
        await target.click({ clickCount: 3 });
        await pause(page, 900);
        await caption(page, "Cliquez sur Régénérer");
        await click(page, page.locator("#regenerateBtn"), { after: 300 });
        await caption(page, "✨ Le passage est réécrit sur place");
        await target.filter({ hasText: /Vous trouverez/ }).waitFor({ timeout: 60000 });
        await page.locator("#regenerateBtn:not([disabled])").waitFor({ timeout: 60000 });
        await pause(page, 800);
        await highlight(page, target);
        await caption(page, "Orthographe, majuscules et ponctuation sont corrigées", 3000);
        await highlight(page, null);
        await caption(page, null, 400);
        await finish({ trimStart: 0.5 });
    },

    // 3.2 Demander à Copilot
    async copilot() {
        const { page, finish } = await startClip("3-2-copilot", { storageState: AUTH });
        await openEditor(page);
        await openDocument(page, DOC, FOLDER);
        await caption(page, "Décrivez la modification à Copilot, avec les informations utiles");
        await type(page, copilotInput(page),
            "Ajoute un paragraphe pour préciser que je joins aussi un timbre fiscal de 2 000 francs CFA.", { delay: 30 });
        await click(page, page.getByTitle("Envoyer"));
        await caption(page, "Copilot rédige, puis modifie directement le document ouvert");
        await paragraph(page, "timbre").waitFor({ timeout: 180000 });
        await waitForCopilot(page);
        await highlight(page, paragraph(page, "timbre"));
        await caption(page, "Le nouveau paragraphe est inséré dans la lettre", 3500);
        await highlight(page, null);
        await caption(page, null, 400);
        await finish({ trimStart: 0.5 });
    },

    // 3.3.1 Message vocal (en wolof)
    async "message-vocal"() {
        const wav = soynadeVoice("wolof-date-20-septembre", "Remplace la date par le vingt septembre.", "wo", "fr");
        // A fresh document, so the panel shows no earlier conversation.
        resetWorkspace();
        seedDocument(FOLDER, DOC, LETTER_HTML);
        await withVirtualMic(async (micEnv) => {
            const { page, finish } = await startClip("3-3-message-vocal", { storageState: AUTH, env: micEnv, audio: true });
            await openEditor(page);
            await openDocument(page, DOC, FOLDER);
            await caption(page, "Cliquez sur le micro de Copilot pour enregistrer votre demande");
            await click(page, page.getByTitle("Message vocal"), { after: 500 });
            await caption(page, "🎙️ En wolof : « Soppi date bi ci vingt septembre » (remplace la date par le 20 septembre)");
            await playIntoMic(wav);
            await caption(page, "Cliquez de nouveau pour terminer, puis envoyez");
            await click(page, page.getByTitle("Arrêter l'enregistrement"), { after: 800 });
            await click(page, page.getByTitle("Envoyer"));
            await caption(page, "Le message est transcrit en français, puis Copilot l'applique");
            await paragraph(page, /20 septembre|vingt septembre/).waitFor({ timeout: 180000 });
            await waitForCopilot(page);
            await highlight(page, paragraph(page, /20 septembre|vingt septembre/));
            await caption(page, "La date de la lettre est modifiée", 3000);
            await highlight(page, null);
            await caption(page, null, 400);
            await finish({ trimStart: 0.5 });
        });
    },
};

// 3.3.3 Étude de cas : d'une audition à un procès-verbal
clips.gendarmerie = async () => {
    const recording = hearingRecording();
    const folder = "Brigade de Thiaroye";
    const doc = "PV d'audition - vol au marché";
    resetWorkspace();
    seedDocument(folder, doc, "<p></p>");
    const { page, finish } = await startClip("3-4-audition-proces-verbal", { storageState: AUTH });
    await openEditor(page);
    await openDocument(page, doc, folder);
    await caption(page, "L'audition des deux plaignants, en wolof, a été enregistrée sur téléphone");
    await pause(page, 1500);
    await caption(page, "Joignez l'enregistrement à Copilot");
    const [chooser] = await Promise.all([
        page.waitForEvent("filechooser"),
        click(page, page.getByTitle("Joindre un fichier"), { after: 300 }),
    ]);
    await chooser.setFiles(recording);
    await page.locator(".copilot-attachment").waitFor();
    await pause(page, 800);
    await caption(page, "Puis donnez votre consigne");
    await type(page, copilotInput(page),
        "Rédige le procès-verbal d'audition des deux plaignants à partir de cet enregistrement.", { delay: 28 });
    await click(page, page.getByTitle("Envoyer"));
    await caption(page, "⏳ Copilot transcrit l'audition, la traduit en français, puis rédige le procès-verbal");
    await page.locator(".ProseMirror").filter({ hasText: /Fatou Sarr/ }).waitFor({ timeout: 240000 });
    await waitForCopilot(page, 240000);
    await caption(page, "Le procès-verbal est rédigé dans le document", 2500);
    await page.locator(".doc-scroll").hover();
    for (let i = 0; i < 6; i++) {
        await page.mouse.wheel(0, 220);
        await pause(page, 700);
    }
    await caption(page, "Relisez-le attentivement : noms, montants, dates, et complétez les champs [à compléter]", 4000);
    await caption(page, null, 400);
    await finish({ trimStart: 0.5 });
};

const wanted = process.argv.slice(2);
for (const [name, run] of Object.entries(clips)) {
    if (!wanted.length || wanted.includes(name)) {
        console.log(`▶ ${name}`);
        await run();
    }
}

export { hearingRecording, HEARING };
