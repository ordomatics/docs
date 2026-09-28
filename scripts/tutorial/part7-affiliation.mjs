// Bonus : affiliation. Run with `node part7-affiliation.mjs [clip...]`.
import { caption, click, highlight, odooShell, pause, startClip, type } from "./lib.mjs";
import { AUTH, EMAIL, openEditor } from "./demo.mjs";

const DEMO_ACCOUNT = `
user = env['res.users'].search([('login', '=', '${EMAIL}')], limit=1)
partner = user.partner_id
account = env['affiliate.account'].sudo().search([('partner_id', '=', partner.id)])
`;

function resetAffiliation() {
    odooShell(`${DEMO_ACCOUNT}
env['affiliate.commission'].sudo().search([('affiliate_id', 'in', account.ids)]).unlink()
env['affiliate.referral'].sudo().search([('affiliate_id', 'in', account.ids)]).unlink()
env['payment.transaction'].sudo().search([('partner_id.name', '=', 'Cliente parrainée (exemple)')]).unlink()
account.unlink()
env.cr.commit()
`);
}

// Approval is the Smartacus team's step; then a fictional referred client
// tops up twice. No real payment or payout is involved.
function approveWithCommissions() {
    odooShell(`${DEMO_ACCOUNT}
from odoo import fields
if not account:
    account = env['affiliate.account'].sudo().create({
        'partner_id': partner.id, 'request_reason': "J'accompagne les associations de mon quartier."})
if account.state != 'approved':
    account.action_approve()
client = env['res.partner'].sudo().search([('name', '=', 'Cliente parrainée (exemple)')], limit=1) \\
    or env['res.partner'].sudo().create({'name': 'Cliente parrainée (exemple)'})
referral = env['affiliate.referral'].sudo().search([('referred_partner_id', '=', client.id)], limit=1) \\
    or env['affiliate.referral'].sudo().create({'affiliate_id': account.id, 'referred_partner_id': client.id})
if not referral.commission_ids:
    xof = env.ref('base.XOF')
    provider = env['payment.provider'].sudo().search([('code', '=', 'wave')], limit=1)
    method = env['payment.method'].sudo().search([('code', '=', 'wave')], limit=1)
    for base in (5000, 10000):
        # Recorded as already done: created directly, so no payment or credit logic runs.
        tx = env['payment.transaction'].sudo().create({
            'provider_id': provider.id, 'payment_method_id': method.id, 'amount': base,
            'currency_id': xof.id, 'partner_id': client.id, 'state': 'done',
            'reference': env['payment.transaction']._compute_reference(provider_code='wave'),
        })
        env['affiliate.commission'].sudo().create({
            'affiliate_id': account.id, 'referral_id': referral.id, 'payment_transaction_id': tx.id,
            'base_amount': base, 'rate': account.commission_rate,
            'amount': base * account.commission_rate / 100, 'currency_id': xof.id,
            'state': 'payable', 'eligible_at': fields.Datetime.now(),
        })
env.cr.commit()
`);
}

async function openAccountPanel(page) {
    await openEditor(page);
    await click(page, page.locator("#toggleAccount"));
}

const clips = {
    // B.1 Devenir affilié
    async demande() {
        resetAffiliation();
        const { page, finish } = await startClip("bonus-1-devenir-affilie", { storageState: AUTH });
        await openAccountPanel(page);
        const card = page.locator(".sa-affiliate-request");
        await highlight(page, card);
        await caption(page, "Dans « Mon compte », la carte Affiliation vous invite à parrainer", 2500);
        await highlight(page, null);
        await click(page, card.getByRole("button", { name: "Vendre ce logiciel" }));
        await caption(page, "Expliquez en quelques mots votre démarche");
        await type(page, card.getByPlaceholder("Pourquoi souhaitez-vous devenir affilié ?"),
            "J'accompagne les associations de mon quartier dans leurs démarches.", { delay: 30 });
        const mobile = card.getByPlaceholder("Votre numéro Wave");
        if (await mobile.isVisible()) {
            await caption(page, "Indiquez le numéro Wave qui recevra vos commissions");
            await type(page, mobile, "70 000 00 00", { delay: 80 });
        }
        await click(page, card.getByRole("button", { name: "Envoyer" }), { after: 1500 });
        const pending = page.locator(".sa-affiliate-card").filter({ hasText: "En attente" });
        await pending.waitFor({ timeout: 15000 });
        await highlight(page, pending);
        await caption(page, "Votre demande est en attente : l'équipe Smartacus vous répond par e-mail", 3500);
        await highlight(page, null);
        await caption(page, null, 400);
        await finish({ trimStart: 0.5 });
    },

    // B.2 et B.3 : l'espace affilié et le retrait
    async espace() {
        approveWithCommissions();
        const { page, finish, fastForward } = await startClip("bonus-2-espace-affilie", { storageState: AUTH });
        await openAccountPanel(page);
        const mini = page.locator(".sa-affiliate-mini");
        await mini.waitFor({ timeout: 15000 });
        await highlight(page, mini);
        await caption(page, "Une fois approuvé, votre solde de parrainage s'affiche ici", 3000);
        await highlight(page, null);
        await caption(page, "Cliquez sur Voir pour ouvrir votre espace affilié");
        // The dev stack builds the referral link on localhost; show the production address instead.
        await page.route("**/editor/affiliate/summary**", async (route) => {
            const response = await route.fetch();
            const body = (await response.text()).replaceAll("http://localhost:8069", "https://smartacus.ordomatics.com");
            await route.fulfill({ response, body });
        });
        await click(page, mini.getByRole("link", { name: "Voir" }), { after: 300 });
        fastForward(8);
        await page.waitForURL(/\/my\/affiliation/, { timeout: 30000 });
        const portal = page.locator(".sa-affiliate-card").first();
        await portal.waitFor({ timeout: 30000 });
        fastForward();
        await pause(page, 1200);
        const link = page.getByLabel("Lien de parrainage").locator("..");
        await highlight(page, link);
        await caption(page, "Partagez votre lien de parrainage : chaque recharge de vos filleuls vous rapporte une commission", 4000);
        await click(page, page.getByTitle("Copier le lien"), { after: 800 });
        await highlight(page, page.locator(".sa-affiliate-balance"));
        await caption(page, "Le solde payable peut être retiré sur votre compte Wave", 3000);
        await highlight(page, null);
        await click(page, page.getByRole("button", { name: "Retirer via Wave" }), { after: 800 });
        const modal = page.getByRole("dialog", { name: "Retirer via Wave" });
        await modal.waitFor();
        await caption(page, "Indiquez le montant, vérifiez le numéro Wave…");
        const amount = modal.locator("input").first();
        await amount.fill("");
        await type(page, amount, "1000", { delay: 150 });
        await highlight(page, modal.getByRole("button", { name: "Confirmer le retrait" }));
        await caption(page, "… puis confirmez : le montant est envoyé par Wave (ici, nous annulons)", 3500);
        await highlight(page, null);
        await click(page, modal.getByRole("button", { name: "Annuler" }), { after: 800 });
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
