// "Onboard a client": add a client to a project's production environment. No voice-over.
import path from "node:path";
import { AUTH, DOCS, PORTAL, PROJECT } from "../getting-started/common.mjs";
import { caption, click, configure, highlight, pause, startClip, type } from "../getting-started/tuto.mjs";

configure({ videoDir: path.join(DOCS, "public/manage") });

const CLIENT = process.env.TUTO_CLIENT || "Teranga";
const EMAIL = process.env.TUTO_CLIENT_EMAIL || "contact@teranga.example";

const { page, finish, fastForward } = await startClip("onboard-a-client", { storageState: AUTH });
const deadline = Date.now() + 30 * 60 * 1000;

await page.goto(`${PORTAL}/my/projects`);
await page.getByRole("link", { name: PROJECT, exact: true }).first().waitFor();
await pause(page, 800);
await caption(page, "Open your project");
await click(page, page.getByRole("link", { name: PROJECT, exact: true }).first());
await page.getByRole("link", { name: "Edit" }).first().waitFor();
await caption(page, "Open its production environment");
await click(page, page.getByRole("link", { name: "Edit" }).first());
await page.getByPlaceholder("client name").waitFor();
await pause(page, 1200);

await caption(page, "Onboard a client: their name and a contact email");
await type(page, page.getByPlaceholder("client name"), CLIENT, { delay: 90 });
await type(page, page.getByPlaceholder("contact email"), EMAIL, { delay: 60 });
await pause(page, 600);
await click(page, page.getByRole("button", { name: "Onboard" }), { after: 1500 });

const row = page.locator("tbody tr", { hasText: CLIENT });
await row.waitFor({ timeout: 60000 });
await caption(page, "The platform prepares their own Odoo, on your servers");
await pause(page, 4000);
await caption(page, null, 300);

// Minutes of provisioning: reload until the row reads Ready; play it fast.
fastForward(30);
for (;;) {
    if (/Ready/.test(await row.innerText().catch(() => ""))) {
        break;
    }
    if (Date.now() > deadline) {
        throw new Error("the client never became Ready");
    }
    await pause(page, 10000);
    await page.reload();
}
fastForward();
await pause(page, 1200);

await caption(page, "Ready: the client has their own address");
await highlight(page, row.getByRole("link").first());
await pause(page, 3500);
await highlight(page, null);
const url = await row.getByRole("link").first().getAttribute("href");

// The address is published by a redeploy that follows. Ask a public resolver,
// never the local one: an early miss would be cached and outlive the wait.
await caption(page, "Your servers restart once to publish the new address");
await pause(page, 3000);
fastForward(30);
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
fastForward();
await caption(page, "Hand them that address: they sign in to their own Odoo");
await page.goto(url);
await page.locator("input[name='login']").waitFor({ timeout: 120000 });
await pause(page, 4000);

await page.goBack();
await row.waitFor();
await caption(page, "Pause or offboard a client from the same list");
await highlight(page, row.locator("td").last());
await pause(page, 3500);
await highlight(page, null);
await caption(page, null, 600);
console.log(`client address: ${url}`);
await finish();
