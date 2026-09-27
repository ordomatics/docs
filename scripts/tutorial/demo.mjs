// Demo account state shared by the part scripts: the logged-in session saved
// by part0 and helpers that reset or seed its workspace on the dev stack.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BASE_URL, click, devEnv, odooShell, pause } from "./lib.mjs";

export const AUTH = path.join(path.dirname(fileURLToPath(import.meta.url)), ".auth/demo.json");
export const EMAIL = devEnv().TUTORIAL_DEMO_EMAIL;

const ROOT = `
from odoo.addons.smartacus_editor.models.dms_provisioning import get_or_create_user_root
user = env['res.users'].search([('login', '=', '${EMAIL}')], limit=1)
root = get_or_create_user_root(env, user)
`;

/** Empties the demo workspace (every file and sub-folder under its root). */
export function resetWorkspace() {
    odooShell(`${ROOT}
env['dms.file'].sudo().search([('directory_id', 'child_of', root.id)]).unlink()
env['dms.directory'].sudo().search([('id', 'child_of', root.id), ('id', '!=', root.id)]).unlink()
env.cr.commit()
`);
}

/** Creates folder/name with the given HTML in the demo workspace. */
export function seedDocument(folder, name, html) {
    odooShell(`${ROOT}
import base64
parent = root
if ${JSON.stringify(folder)}:
    parent = env['dms.directory'].sudo().search([('parent_id', '=', root.id), ('name', '=', ${JSON.stringify(folder)})], limit=1) \\
        or env['dms.directory'].sudo().create({'name': ${JSON.stringify(folder)}, 'parent_id': root.id})
f = env['dms.file'].sudo().search([('directory_id', '=', parent.id), ('name', '=', ${JSON.stringify(name)})], limit=1)
vals = {'content': base64.b64encode(${JSON.stringify(html)}.encode())}
if f:
    f.write(vals)
else:
    env['dms.file'].sudo().create({'name': ${JSON.stringify(name)}, 'directory_id': parent.id, **vals})
env.cr.commit()
`);
}

export async function openEditor(page) {
    await page.goto(`${BASE_URL}/editor`, { waitUntil: "networkidle" });
    await pause(page, 800);
}

/** Opens a document from the files panel by its visible name. */
export async function openDocument(page, name, folder) {
    if (folder) {
        await click(page, page.locator(".file-item").filter({ hasText: folder }).first(), { after: 500 });
    }
    await click(page, page.locator(".file-item").filter({ hasText: name }).first(), { after: 1200 });
}

// A fictional citizen's request, used across the tutorial.
export const LETTER_HTML = `<p>Aminata Ndiaye<br>Cité Keur Gorgui, Villa 12<br>Dakar</p>
<p style="text-align: right">Dakar, le 15 septembre 2026</p>
<p>À Monsieur l'Officier de l'état civil<br>Mairie de Dakar-Plateau</p>
<p><strong>Objet : demande de copie intégrale d'acte de naissance</strong></p>
<p>Monsieur l'Officier de l'état civil,</p>
<p>Je vous prie de bien vouloir me délivrer une copie intégrale de mon acte de naissance, établi à Dakar le 3 mars 1994 sous le numéro 1245.</p>
<p>Ce document m'est demandé pour la constitution de mon dossier de passeport.</p>
<p>Je vous prie d'agréer, Monsieur l'Officier de l'état civil, l'expression de mes salutations distinguées.</p>
<p>Aminata Ndiaye</p>`;
