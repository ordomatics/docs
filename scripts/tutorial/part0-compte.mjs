// Partie 0 : Votre compte. Run with `node part0-compte.mjs [clip...]`.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import {
    BASE_URL, caption, click, devEnv, highlight, odooShell, pause, psql, screenshot, startClip, type,
} from "./lib.mjs";

const AUTH = path.join(path.dirname(fileURLToPath(import.meta.url)), ".auth/demo.json");
const env = devEnv();
const EMAIL = env.TUTORIAL_DEMO_EMAIL;
const PASSWORD = env.TUTORIAL_DEMO_PASSWORD;
const CODE = env.TUTORIAL_DEMO_CODE;

function resetDemoAccount() {
    odooShell(`
users = env['res.users'].with_context(active_test=False).search([('login', '=', '${EMAIL}')])
# Everything the recordings attach to the demo user, so it can be deleted and signed up again.
env['llm.thread'].sudo().with_context(active_test=False).search([('user_id', 'in', users.ids)]).unlink()
accounts = env['affiliate.account'].sudo().search([('partner_id', 'in', users.partner_id.ids)])
env['affiliate.commission'].sudo().search([('affiliate_id', 'in', accounts.ids)]).unlink()
env['affiliate.referral'].sudo().search([('affiliate_id', 'in', accounts.ids)]).unlink()
env['payment.transaction'].sudo().search([('partner_id.name', '=', 'Cliente parrainée (exemple)')]).unlink()
accounts.unlink()
users.sudo().unlink()
env['smartacus.otp'].sudo().search([('identity_key', '=', '${EMAIL}')]).unlink()
env.cr.commit()
`);
}

async function openAccountPanel(page) {
    await page.goto(`${BASE_URL}/editor`, { waitUntil: "networkidle" });
    await pause(page, 800);
    await click(page, page.locator("#toggleAccount"));
}

const clips = {
    // 0.1 Créer un compte
    async "creer-un-compte"() {
        resetDemoAccount();
        const { page, context, finish } = await startClip("0-1-creer-un-compte");
        await openAccountPanel(page);
        await caption(page, "Ouvrez « Mon compte », puis cliquez sur Se connecter");
        await click(page, page.locator("#openLoginBtn"));
        await caption(page, "Choisissez « Créer un compte »");
        await click(page, page.getByRole("link", { name: "Créer un compte" }));
        const dialog = page.locator(".sa-auth-dialog");
        await caption(page, "Saisissez votre adresse e-mail et choisissez un mot de passe");
        await type(page, dialog.getByPlaceholder("Adresse e-mail"), EMAIL);
        await type(page, dialog.getByPlaceholder("Mot de passe"), PASSWORD, { delay: 35 });
        await caption(page, "Acceptez les conditions, puis créez votre compte");
        await click(page, dialog.locator(".sa-auth-checkbox input"));
        await click(page, dialog.getByRole("button", { name: "Créer mon compte" }), { after: 300 });
        await dialog.getByPlaceholder("Code à 6 chiffres").waitFor();
        // The real code went to the demo mailbox; give the pending one a known value.
        const hash = crypto.createHash("sha256").update(CODE).digest("hex");
        psql(`update smartacus_otp set code_hash='${hash}' where id=(select max(id) from smartacus_otp where identity_key='${EMAIL}' and purpose='signup')`);
        await caption(page, "Un code à 6 chiffres vous est envoyé par e-mail — pensez à regarder dans vos spams", 3200);
        await type(page, dialog.getByPlaceholder("Code à 6 chiffres"), CODE, { delay: 140 });
        await caption(page, "Cliquez sur Vérifier");
        await click(page, dialog.getByRole("button", { name: "Vérifier" }), { after: 300 });
        await dialog.waitFor({ state: "detached", timeout: 30000 });
        await caption(page, "C'est fait : vous êtes connecté", 1500);
        if (!(await page.locator(".credit-card-info").isVisible())) {
            await click(page, page.locator("#toggleAccount"));
        }
        await highlight(page, page.locator(".credit-card-info"));
        await caption(page, "Votre solde de crédits s'affiche dans « Mon compte »", 3500);
        await highlight(page, null);
        fs.mkdirSync(path.dirname(AUTH), { recursive: true });
        await context.storageState({ path: AUTH });
        await caption(page, null, 500);
        await finish({ trimStart: 0.5 });
    },
};

// Stand-in for the live Wave checkout: a real session would put a payable
// QR code in a public video.
async function fakeWaveCheckout(page) {
    const qrcode = await QRCode.toDataURL("EXEMPLE - QR code de démonstration Smartacus", { width: 440, margin: 1 });
    await page.route("**/editor/request-payment", (route) => route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ success: true, qrcode, wave_launch_url: "https://pay.wave.com/exemple" }),
    }));
}

function addDemoCredits(amount) {
    odooShell(`
from odoo.addons.smartacus_editor_billing.services import credits
user = env['res.users'].search([('login', '=', '${EMAIL}')], limit=1)
credits.get_account(env, user.partner_id).add_credits(${amount}, ref='Recharge Wave (démo)')
env.cr.commit()
`);
}

Object.assign(clips, {
    // 0.2 Se connecter / se déconnecter
    async connexion() {
        const guest = await startClip(null);
        await openAccountPanel(guest.page);
        await click(guest.page, guest.page.locator("#openLoginBtn"));
        const dialog = guest.page.locator(".modal-content").filter({ has: guest.page.locator(".sa-auth-dialog") });
        await highlight(guest.page, dialog);
        await screenshot(guest.page, "0-2-se-connecter");
        await highlight(guest.page, null);
        await click(guest.page, guest.page.getByRole("link", { name: "Mot de passe oublié ?" }));
        await highlight(guest.page, dialog);
        await screenshot(guest.page, "0-2-mot-de-passe-oublie");
        await guest.finish();

        const user = await startClip(null, { storageState: AUTH });
        await openAccountPanel(user.page);
        await highlight(user.page, user.page.locator("#logoutRow"));
        await screenshot(user.page, "0-2-deconnexion");
        await user.finish();
    },

    // 0.3 Crédits et recharge
    async recharger() {
        const { page, finish } = await startClip("0-3-recharger", { storageState: AUTH });
        await fakeWaveCheckout(page);
        await openAccountPanel(page);
        await highlight(page, page.locator(".credit-card-info"));
        await caption(page, "Vos crédits disponibles s'affichent dans « Mon compte »", 2500);
        await highlight(page, null);
        await caption(page, "Pour en ajouter, cliquez sur Recharger");
        await click(page, page.locator("#rechargeBtn"));
        const dialog = page.locator(".modal-content").last();
        await caption(page, "Indiquez le montant en francs CFA (100 XOF minimum)");
        await type(page, dialog.getByPlaceholder("Montant (XOF)"), "1000", { delay: 150 });
        await click(page, dialog.getByRole("button", { name: "Recharger" }));
        await dialog.getByAltText("QR code Wave").waitFor();
        await caption(page, "Scannez le QR code avec l'application Wave et validez le paiement", 4000);
        addDemoCredits(1000);
        await page.getByText("Recharge confirmée avec succès !").waitFor({ timeout: 30000 });
        await caption(page, "Le paiement est confirmé automatiquement", 2500);
        await dialog.waitFor({ state: "detached", timeout: 10000 });
        await highlight(page, page.locator(".credit-card-info"));
        await caption(page, "Vos crédits sont aussitôt ajoutés à votre solde", 3500);
        await highlight(page, null);
        await caption(page, null, 400);
        await finish({ trimStart: 0.5 });
    },

    // 0.4 Paramètres
    async parametres() {
        const { page, finish } = await startClip(null, { storageState: AUTH });
        await openAccountPanel(page);
        await click(page, page.getByRole("button", { name: "Paramètres" }));
        await pause(page, 600);
        await highlight(page, page.locator("*").filter({ hasText: /^Aperçu IA/ }).filter({ has: page.locator("input") }).last());
        await screenshot(page, "0-4-parametres");
        await finish();
    },

    // 0.5 Aide WhatsApp
    async whatsapp() {
        const { page, finish } = await startClip(null, { storageState: AUTH });
        await openAccountPanel(page);
        await highlight(page, page.locator("a.icon-btn.whatsapp"));
        await screenshot(page, "0-5-aide-whatsapp");
        await finish();
    },
});

const wanted = process.argv.slice(2);
for (const [name, run] of Object.entries(clips)) {
    if (!wanted.length || wanted.includes(name)) {
        console.log(`▶ ${name}`);
        await run();
    }
}
