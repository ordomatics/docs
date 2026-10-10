// Partie 9 : la GED du back-office, pour un client Smartacus Pro avec sa
// propre base dédiée. Deux utilisateurs internes simulent ce que l'équipe
// configure à la main une fois la base d'un client livrée : une associée
// (Fatou) et l'admin du cabinet (Maître Sy), qui voit tout en lecture seule.
// Run with `node part9-ged.mjs [clip...]`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_URL, caption, click, devEnv, highlight, odooShell, startClip } from "./lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUTH_AGENT = path.join(HERE, ".auth/ged-agent.json");
const AUTH_ADMIN = path.join(HERE, ".auth/ged-admin.json");
const env = devEnv();
const AGENT_EMAIL = env.TUTORIAL_GED_AGENT_EMAIL;
const AGENT_PASSWORD = env.TUTORIAL_GED_AGENT_PASSWORD;
const ADMIN_EMAIL = env.TUTORIAL_GED_ADMIN_EMAIL;
const ADMIN_PASSWORD = env.TUTORIAL_GED_ADMIN_PASSWORD;

const DOCS = [
    ["Bail commercial - Immeuble Fann (exemple).html",
        "<p>Bail commercial entre le Cabinet Sy et la SCI Fann Résidence, portant sur un local de 80 m², pour une durée de 3 ans à compter du 1er novembre 2026.</p>"],
    ["Statuts - SARL Teranga Services (exemple).html",
        "<p>Article 1 — Il est formé entre les soussignés une société à responsabilité limitée régie par les présents statuts et par les dispositions légales en vigueur.</p>"],
    ["Mise en demeure - Facture impayée (exemple).html",
        "<p>Maître, je vous mets en demeure de régler, sous huitaine, la facture n°2026-114 restée impayée depuis le 2 septembre 2026.</p>"],
];

// What the team configures by hand once a client's own database is live:
// two internal users (not portal), each with a DMS root, the admin also
// holding the institution's read-only oversight group over the others'.
function seedGed() {
    odooShell(`
from odoo.addons.smartacus_editor.models.dms_provisioning import get_or_create_user_root, sync_institution_access
import base64
U = env['res.users'].sudo(); P = env['res.partner'].sudo()
internal = env.ref('base.group_user'); dms_user = env.ref('dms.group_dms_user'); editor = env.ref('smartacus_editor.group_editor_user')
inst = P.search([('name', '=', 'Cabinet Sy (exemple)')]) or P.create({'name': 'Cabinet Sy (exemple)', 'is_company': True})
def mk(login, password, name, admin=False):
    u = U.search([('login', '=', login)])
    if not u:
        u = U.with_context(no_reset_password=True).create({
            'name': name, 'login': login, 'email': login, 'password': password,
            'groups_id': [(6, 0, [internal.id, dms_user.id, editor.id])]})
    u.write({'groups_id': [(6, 0, [internal.id, dms_user.id, editor.id])], 'is_org_admin': admin, 'password': password})
    u.partner_id.write({'name': name, 'parent_id': inst.id, 'smartacus_institution_id': inst.id})
    root = get_or_create_user_root(env, u)
    root.write({'name': name})
    return u, root
agent, agent_root = mk(${JSON.stringify(AGENT_EMAIL)}, ${JSON.stringify(AGENT_PASSWORD)}, 'Fatou Ndiaye')
mk(${JSON.stringify(ADMIN_EMAIL)}, ${JSON.stringify(ADMIN_PASSWORD)}, 'Maître Sy', admin=True)
sync_institution_access(env, inst)
env['dms.file'].sudo().search([('directory_id', 'child_of', agent_root.id)]).unlink()
for name, html in ${JSON.stringify(DOCS)}:
    env['dms.file'].sudo().create({'name': name, 'directory_id': agent_root.id, 'content': base64.b64encode(html.encode())})
env.cr.commit()
`);
}

async function saveAuth(email, password, authFile) {
    const { page, context, finish } = await startClip(null);
    await page.goto(`${BASE_URL}/web/login`);
    await page.fill("input[name=login]", email);
    await page.fill("input[name=password]", password);
    await Promise.all([
        page.waitForURL(/\/odoo\//, { timeout: 15000 }),
        page.click("button[type=submit]"),
    ]);
    fs.mkdirSync(path.dirname(authFile), { recursive: true });
    await context.storageState({ path: authFile });
    await finish();
}

const clips = {
    // 9.1 Classement automatique : les documents de Fatou, retrouvés tels
    // quels dans le back-office, sans aucun classement manuel.
    async "automatique"() {
        seedGed();
        await saveAuth(AGENT_EMAIL, AGENT_PASSWORD, AUTH_AGENT);
        const { page, finish } = await startClip("9-1-ged-automatique", { storageState: AUTH_AGENT });
        await caption(page, "Chaque document édité dans Smartacus Pro a sa place dans l'espace de l'entreprise", 1800);
        await page.goto(`${BASE_URL}/odoo/action-259`, { waitUntil: "domcontentloaded" });
        await page.locator(".o_kanban_record").first().waitFor();
        await highlight(page, page.locator(".o_kanban_renderer"));
        await caption(page, "Dans le back-office, les documents de Fatou sont déjà classés, sans aucun rangement manuel", 4000);
        await highlight(page, null);
        await caption(page, null, 400);
        await finish({ trimStart: 0.5 });
    },

    // 9.2 Supervision : Maître Sy, admin du cabinet, voit les dossiers de
    // toute l'équipe, en lecture seule.
    async "supervision"() {
        seedGed();
        await saveAuth(ADMIN_EMAIL, ADMIN_PASSWORD, AUTH_ADMIN);
        const { page, finish } = await startClip("9-2-ged-supervision", { storageState: AUTH_ADMIN });
        await page.goto(`${BASE_URL}/odoo/action-259`, { waitUntil: "domcontentloaded" });
        await page.locator(".o_search_panel").waitFor();
        await caption(page, "Maître Sy, admin du cabinet, retrouve les documents de toute son équipe au même endroit", 1800);
        await highlight(page, page.locator(".o_search_panel"));
        await caption(page, "Y compris ceux de Fatou, sans qu'il ait rien configuré", 3000);
        await highlight(page, null);
        await click(page, page.locator(".o_search_panel_label").filter({ hasText: "Fatou" }));
        await highlight(page, page.locator(".o_kanban_renderer"));
        await caption(page, "Il consulte, mais ne peut ni modifier ni supprimer les documents de ses agents", 4000);
        await highlight(page, null);
        await caption(page, null, 400);
        await finish({ trimStart: 0.5 });
    },
};

const wanted = process.argv.slice(2);
for (const [name, run] of Object.entries(clips)) {
    if (!wanted.length || wanted.includes(name)) {
        console.log(`--- ${name} ---`);
        await run();
    }
}
