// Shared by the "Ship a change" recordings: watching CI, the portal, and the field on a site.
import { GITHUB_USER, PORTAL, PROJECT, sh, until } from "../getting-started/common.mjs";
import { caption, click, highlight, pause } from "../getting-started/tuto.mjs";

export const REPO = `${GITHUB_USER}/${PROJECT}`;
export const FIELD = "ged_filed_on";

// The CI run for a commit on a branch, played fast, ending on the GitHub Actions page.
export async function watchRun(page, { sha, branch, fastForward, text }) {
    await page.goto(`https://github.com/${REPO}/actions`);
    await pause(page, 2500);
    await caption(page, text);
    await pause(page, 5000);
    fastForward(30);
    const result = await until(async () => {
        const out = sh(`gh run list --repo ${REPO} --branch ${branch} --commit ${sha} --workflow "CI/CD Pipeline" --json status,conclusion -q '.[0] | "\\(.status) \\(.conclusion)"'`,
            { allowFail: true }).trim();
        await page.reload();
        return out.startsWith("completed") ? out : null;
    }, { timeout: 40 * 60 * 1000, every: 15000, what: `the ${branch} run` });
    fastForward();
    if (!/success/.test(result)) {
        throw new Error(`the ${branch} run did not succeed: ${result}`);
    }
    await pause(page, 3000);
    await caption(page, null, 300);
}

// An environment's page in the portal, reloaded until it runs the commit's image and is up to date.
export async function waitForImage(page, { environment, sha, fastForward, text }) {
    await page.goto(`${PORTAL}/my/projects`);
    await click(page, page.getByRole("link", { name: PROJECT, exact: true }).first());
    await click(page, page.getByRole("link", { name: environment, exact: true }).first());
    await page.locator(".card", { hasText: "Code & deploy" }).first().waitFor();
    await caption(page, text);
    fastForward(30);
    await until(async () => {
        await page.reload();
        const card = await page.locator(".card", { hasText: "Code & deploy" }).first().innerText();
        return card.includes(sha.slice(0, 8)) && /Up to date/.test(card);
    }, { timeout: 40 * 60 * 1000, every: 10000, what: `${environment} to run ${sha.slice(0, 8)}` });
    fastForward();
    await pause(page, 1500);
    await highlight(page, page.locator(".card", { hasText: "Code & deploy" }).first());
    await pause(page, 3500);
    await highlight(page, null);
}

// Signs in to a site and shows the new field on a new document.
export async function showField(page, site, text) {
    // Right after a rollout a site can answer 503, or still be upgrading a client's database.
    await until(async () => {
        await page.goto(`${site}/web/login`).catch(() => {});
        return page.locator("input[name=login]").waitFor({ timeout: 15000 }).then(() => true).catch(() => false);
    }, { timeout: 15 * 60 * 1000, every: 10000, what: `${site} to answer` });
    await caption(page, text);
    await click(page, page.locator("input[name=login]"), { after: 150 });
    await page.keyboard.type("admin", { delay: 80 });
    await click(page, page.locator("input[name=password]"), { after: 150 });
    await page.keyboard.type("admin", { delay: 80 });
    await click(page, page.getByRole("button", { name: "Log in" }), { after: 1000 });
    await page.waitForURL(/\/odoo/, { timeout: 90000 });
    await until(async () => {
        await page.goto(`${site}/odoo/action-dms.action_dms_file`).catch(() => {});
        return page.getByRole("button", { name: "New" }).first().waitFor({ timeout: 20000 }).then(() => true).catch(() => false);
    }, { timeout: 15 * 60 * 1000, every: 10000, what: `${site} to serve the module` });
    await pause(page, 1200);
    await click(page, page.getByRole("button", { name: "New" }).first(), { after: 1500 });
    const field = page.locator(`.o_field_widget[name=${FIELD}]`).first();
    await field.waitFor({ timeout: 30000 });
    await highlight(page, page.locator(".o_wrap_field, .o_cell", { has: page.locator(`[name=${FIELD}]`) }).first().or(field).first());
    await pause(page, 4000);
    await highlight(page, null);
}
