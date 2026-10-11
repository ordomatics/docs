// "Add a test environment": a copy of the project's live data on its own address. No voice-over.
import path from "node:path";
import { AUTH, DOCS, PORTAL, PROJECT } from "../getting-started/common.mjs";
import { caption, click, configure, highlight, pause, startClip } from "../getting-started/tuto.mjs";

configure({ videoDir: path.join(DOCS, "public/manage") });

const NAME = process.env.TUTO_ENVIRONMENT || "test";

const { page, finish, fastForward } = await startClip("add-a-test-environment", { storageState: AUTH });
const deadline = Date.now() + 40 * 60 * 1000;

await page.goto(`${PORTAL}/my/projects`);
await page.getByRole("link", { name: PROJECT, exact: true }).first().waitFor();
await pause(page, 800);
await caption(page, "Open your project");
await click(page, page.getByRole("link", { name: PROJECT, exact: true }).first());
const card = page.locator(".card", { hasText: "Add an environment" }).last();
await card.waitFor();
await card.scrollIntoViewIfNeeded();
await pause(page, 1200);

await caption(page, "Add an environment: a copy of your live data, on its own address");
const choice = card.locator("select[name=name]");
await click(page, choice, { after: 400 });
await choice.selectOption(NAME);
await pause(page, 1000);
await click(page, card.getByRole("button", { name: "Create" }), { after: 1500 });

const env = page.locator(".o_saas_environment_card", { hasText: new RegExp(`^\\s*${NAME}\\b`) });
await env.waitFor({ timeout: 60000 });
await env.scrollIntoViewIfNeeded();
await caption(page, "The platform copies every database and keeps the copy switched off until it is safe");
await pause(page, 4500);
await caption(page, null, 300);

// Minutes of provisioning: reload until the card reads Running; play it fast.
fastForward(30);
for (;;) {
    if (/Running/.test(await env.locator(".badge").first().innerText().catch(() => ""))) {
        break;
    }
    if (Date.now() > deadline) {
        throw new Error("the environment never reached Running");
    }
    await pause(page, 10000);
    await page.reload();
}
fastForward();
await pause(page, 1200);

await caption(page, "Running: the copy has its own address");
const link = env.locator("a[target=_blank]").first();
await highlight(page, link);
await pause(page, 3500);
await highlight(page, null);
const url = await link.getAttribute("href");

// Ask a public resolver, never the local one: an early miss would be cached
// and outlive the wait.
async function answers(url) {
    const host = new URL(url).hostname;
    for (;;) {
        const answer = await fetch(`https://1.1.1.1/dns-query?name=${host}&type=A`, { headers: { accept: "application/dns-json" } })
            .then((r) => r.json()).catch(() => ({}));
        if ((answer.Answer || []).length) {
            break;
        }
        if (Date.now() > deadline) {
            throw new Error(`${host} never resolved`);
        }
        await pause(page, 10000);
    }
    for (;;) {
        const status = await fetch(`${url}/web/login`).then((r) => r.status).catch(() => 0);
        if (status === 200) {
            break;
        }
        if (Date.now() > deadline) {
            throw new Error(`${url} never answered`);
        }
        await pause(page, 10000);
    }
}

await caption(page, "The addresses are published a moment later");
fastForward(30);
await answers(url);
const clients = ["teranga", "baobab"].map((name) => `https://${name}.${new URL(url).hostname}`);
for (const address of clients) {
    await answers(address);
}
fastForward();
await caption(page, "Open it: try a change here before it reaches anyone");
await page.goto(url);
await page.locator("input[name='login']").waitFor({ timeout: 120000 });
await pause(page, 4000);

await page.goBack();
await env.waitFor();
await caption(page, "Open the environment to see everything it copied");
await click(page, env.getByRole("link", { name: "Edit" }), { after: 1500 });
await page.getByRole("link", { name: clients[0] }).first().waitFor({ timeout: 60000 });
await caption(page, "Every database comes along, and each client keeps its own address");
await highlight(page, page.getByRole("link", { name: clients[0] }).first());
await pause(page, 2500);
await highlight(page, page.getByRole("link", { name: clients[1] }).first());
await pause(page, 2500);
await highlight(page, null);
await caption(page, "Their data is the live data as of now, with mail and payments switched off");
await page.goto(clients[0]);
await page.locator("input[name='login']").waitFor({ timeout: 120000 });
await pause(page, 4000);

await page.goBack();
const remove = page.locator("div.border-top", { hasText: "Remove this environment" }).last();
await remove.waitFor();
await remove.scrollIntoViewIfNeeded();
await caption(page, "When you are done, remove the environment here. Your live data is untouched");
await highlight(page, remove);
await pause(page, 4500);
await highlight(page, null);
await caption(page, null, 600);
console.log(`test environment address: ${url}`);
await finish();
