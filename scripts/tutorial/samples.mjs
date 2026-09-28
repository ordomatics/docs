// Fictional sample documents for Partie 4, also offered for download on the
// site: a text PDF (invoice) and an image-only "scanned" PDF (two-page letter).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SAMPLES_DIR = path.resolve(HERE, "../../public/editeur/exemples");
export const INVOICE_PDF = path.join(SAMPLES_DIR, "facture-atelier-couture.pdf");
export const SCAN_PDF = path.join(SAMPLES_DIR, "convocation-scannee.pdf");
export const PHOTO_JPG = path.join(SAMPLES_DIR, "devis-photo.jpg");

const PAGE_CSS = `
  @page { size: A4; margin: 0 }
  body { margin: 0; font: 15px/1.5 "DejaVu Serif", Georgia, serif; color: #1a1a1a; }
  .page { width: 210mm; height: 297mm; padding: 22mm 20mm; box-sizing: border-box; page-break-after: always; position: relative; }
  h1 { font-size: 22px; letter-spacing: .5px; margin: 0 0 4px; }
  h2 { font-size: 17px; margin: 22px 0 8px; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; }
  th, td { border: 1px solid #555; padding: 6px 8px; text-align: left; }
  th { background: #eee; }
  td.n { text-align: right; }
  .right { text-align: right; }
  .muted { color: #555; font-size: 13px; }
  .footer { position: absolute; bottom: 16mm; left: 20mm; right: 20mm; font-size: 12px; color: #666; text-align: center; }`;

const INVOICE = `<div class="page">
  <h1>ATELIER COUTURE NDÈYE</h1>
  <div class="muted">Médina, rue 11 x 20 — Dakar · Tél. 33 800 00 00 (exemple)</div>
  <p class="right">Dakar, le 12 septembre 2026</p>
  <h2>FACTURE N° 2026-045</h2>
  <p>Client : Association des parents d'élèves de la Médina<br>À l'attention de Mme Awa Fall, trésorière</p>
  <table>
    <tr><th>Désignation</th><th>Quantité</th><th>Prix unitaire (F CFA)</th><th>Total (F CFA)</th></tr>
    <tr><td>Uniformes scolaires (chemise + pantalon)</td><td class="n">40</td><td class="n">7 500</td><td class="n">300 000</td></tr>
    <tr><td>Blouses de fête de fin d'année</td><td class="n">25</td><td class="n">5 000</td><td class="n">125 000</td></tr>
    <tr><td>Retouches</td><td class="n">10</td><td class="n">1 500</td><td class="n">15 000</td></tr>
    <tr><td colspan="3" class="right"><strong>Total à payer</strong></td><td class="n"><strong>440 000</strong></td></tr>
  </table>
  <p>Arrêtée la présente facture à la somme de quatre cent quarante mille francs CFA.</p>
  <p>Paiement à 30 jours, par Wave ou en espèces à l'atelier.</p>
  <p class="right">Ndèye Sow<br>Gérante</p>
  <div class="footer">Document fictif créé pour le tutoriel de l'éditeur Smartacus.</div>
</div>`;

const LETTER = [`<div class="page">
  <p><strong>ASSOCIATION DES PARENTS D'ÉLÈVES DE LA MÉDINA</strong><br>École élémentaire de la Médina — Dakar</p>
  <p class="right">Dakar, le 18 septembre 2026</p>
  <p>À tous les parents d'élèves</p>
  <p><strong>Objet : convocation à l'assemblée générale de rentrée</strong></p>
  <p>Chers parents,</p>
  <p>Le bureau de l'Association des parents d'élèves a le plaisir de vous convier à l'assemblée
  générale de rentrée, qui se tiendra le <strong>samedi 3 octobre 2026 à 10 heures</strong>,
  dans la grande salle de l'école.</p>
  <p>Cette assemblée est l'occasion de faire le bilan de l'année écoulée, de présenter le budget
  de la nouvelle année scolaire et d'élire les membres du bureau pour la période 2026-2027.</p>
  <h2>Ordre du jour</h2>
  <p>1. Mot de bienvenue du président<br>
  2. Rapport moral de l'année 2025-2026<br>
  3. Rapport financier présenté par la trésorière<br>
  4. Uniformes scolaires : bilan de la commande groupée<br>
  5. Budget prévisionnel 2026-2027<br>
  6. Élection du nouveau bureau<br>
  7. Questions diverses</p>
  <div class="footer">Page 1/2</div>
</div>`, `<div class="page">
  <p>La cotisation annuelle reste fixée à <strong>2 000 francs CFA par famille</strong>. Elle pourra être
  réglée sur place le jour de l'assemblée, ou auprès de la trésorière, Mme Awa Fall.</p>
  <p>Les parents qui souhaitent se porter candidats au bureau sont invités à se faire connaître
  avant le 30 septembre 2026, auprès du secrétariat de l'école.</p>
  <p>Votre présence est importante : les décisions prises lors de cette assemblée concernent
  directement la scolarité de nos enfants.</p>
  <p>Nous comptons sur votre participation et vous prions d'agréer, chers parents,
  l'expression de nos salutations distinguées.</p>
  <p class="right">Pour le bureau,<br>Le président<br>Ibrahima Ba</p>
  <div class="footer">Page 2/2 · Document fictif créé pour le tutoriel de l'éditeur Smartacus.</div>
</div>`];


const QUOTE = `<div class="page">
  <h1>QUINCAILLERIE KEUR MASSAR</h1>
  <div class="muted">Marché de Keur Massar — Dakar · Tél. 33 800 00 01 (exemple)</div>
  <p class="right">Dakar, le 22 septembre 2026</p>
  <h2 style="text-align:center">DEVIS N° D-2026-118</h2>
  <p>Client : Association des parents d'élèves de la Médina<br>Objet : réfection de deux salles de classe</p>
  <table>
    <tr><th>Désignation</th><th>Quantité</th><th>Prix unitaire</th><th>Total (F CFA)</th></tr>
    <tr><td>Sacs de ciment 50 kg</td><td class="n">12</td><td class="n">4 800</td><td class="n">57 600</td></tr>
    <tr><td>Peinture acrylique blanche 20 L</td><td class="n">6</td><td class="n">32 500</td><td class="n">195 000</td></tr>
    <tr><td>Rouleaux et pinceaux (lot)</td><td class="n">4</td><td class="n">6 000</td><td class="n">24 000</td></tr>
    <tr><td>Carreaux 40 x 40 (m²)</td><td class="n">35</td><td class="n">7 200</td><td class="n">252 000</td></tr>
    <tr><td>Main-d'œuvre (forfait)</td><td class="n">1</td><td class="n">150 000</td><td class="n">150 000</td></tr>
    <tr><td colspan="3" class="right"><strong>Total</strong></td><td class="n"><strong>678 600</strong></td></tr>
  </table>
  <p>Arrêté le présent devis à la somme de six cent soixante-dix-huit mille six cents francs CFA.</p>
  <p>Devis valable 30 jours.</p>
  <div style="margin:30px 0 0 auto;width:210px;text-align:center">
    <div style="border:3px double #2a4b9b;color:#2a4b9b;border-radius:50%;width:150px;height:150px;margin:0 auto;display:flex;align-items:center;justify-content:center;transform:rotate(-12deg);font:700 14px/1.3 sans-serif">QUINCAILLERIE<br>KEUR MASSAR<br>— EXEMPLE —</div>
    <div>Le gérant</div>
  </div>
  <div class="footer">Document fictif créé pour le tutoriel de l'éditeur Smartacus.</div>
</div>`;

const html = (body) => `<!doctype html><meta charset="utf-8"><style>${PAGE_CSS}</style>${body}`;

export async function makeSamples({ force = false } = {}) {
    // Regenerated bytes differ every run (grain, PDF dates): keep the published files.
    if (!force && [INVOICE_PDF, SCAN_PDF, PHOTO_JPG].every((f) => fs.existsSync(f))) {
        return { INVOICE_PDF, SCAN_PDF, PHOTO_JPG };
    }
    fs.mkdirSync(SAMPLES_DIR, { recursive: true });
    const browser = await chromium.launch({ channel: "chrome" });
    const page = await browser.newPage();
    await page.setContent(html(INVOICE));
    await page.pdf({ path: INVOICE_PDF, format: "A4", printBackground: true });

    // Scan: each page rendered to an image, then tilted, grained and softened.
    await page.setViewportSize({ width: 794, height: 1123 });
    const tmp = fs.mkdtempSync("/tmp/tuto-scan-");
    const scans = [];
    for (const [i, body] of LETTER.entries()) {
        await page.setContent(html(body));
        const png = path.join(tmp, `p${i}.png`);
        await page.screenshot({ path: png, fullPage: false, scale: "device" });
        const out = path.join(tmp, `s${i}.jpg`);
        execFileSync("convert", [png, "-resize", "200%", "-colorspace", "Gray", "-background", "#f4f1ea",
            "-rotate", i ? "-0.7" : "0.9", "-attenuate", "0.35", "+noise", "Gaussian", "-blur", "0x0.6",
            "-level", "8%,92%", "-gravity", "center", "-extent", "1588x2246", "-quality", "70", out]);
        scans.push(out);
    }

    // Photo: the quote shot at an angle on a table, with uneven light.
    await page.setContent(html(QUOTE));
    const shot = path.join(tmp, "quote.png");
    await page.screenshot({ path: shot });
    execFileSync("convert", [shot, "-resize", "150%", "-bordercolor", "#fbfaf6", "-border", "10",
        "-virtual-pixel", "background", "-background", "#6b4f3a", "-extent", "1300x1800-45-45",
        "-distort", "Perspective", "55,55 110,90  1245,55 1190,40  55,1745 60,1720  1245,1745 1265,1760",
        "(", "-size", "1300x1800", "radial-gradient:#ffffff-#9a9a9a", ")", "-compose", "multiply", "-composite",
        "-attenuate", "0.25", "+noise", "Gaussian", "-blur", "0x0.5", "-quality", "82", PHOTO_JPG]);
    await browser.close();
    execFileSync("convert", [...scans, "-density", "144", "-units", "PixelsPerInch", SCAN_PDF]);
    fs.rmSync(tmp, { recursive: true, force: true });
    return { INVOICE_PDF, SCAN_PDF, PHOTO_JPG };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    console.log(await makeSamples({ force: true }));
}
