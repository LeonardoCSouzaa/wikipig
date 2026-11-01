// Migra um HTML de diferencial (matriz) para content/pages/<slug>.json,
// extraindo as fotos base64 para /public/fotos/<slug>/.
// Uso: node scripts/migrate.mjs "<html>" <slug> <topic>

import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const [, , htmlPath, slug, topic] = process.argv;
if (!htmlPath || !slug || !topic) {
  console.error('Uso: node scripts/migrate.mjs "<html>" <slug> <topic>');
  process.exit(1);
}

const ROOT = process.cwd();
const raw = fs.readFileSync(htmlPath, "utf8");

// ---- FOTOS (objeto JSON inline no script) ----
let FOTOS = {};
{
  const line = raw.split(/\r?\n/).find((l) => /^\s*var FOTOS\s*=/.test(l));
  if (line) {
    const jsonStr = line.replace(/^\s*var FOTOS\s*=\s*/, "").replace(/;\s*$/, "");
    try {
      FOTOS = JSON.parse(jsonStr);
    } catch (e) {
      console.warn("Falha ao parsear FOTOS:", e.message);
    }
  }
}

const dom = new JSDOM(raw);
const doc = dom.window.document;

const txt = (el) => (el ? el.textContent.trim() : "");

// remove botões de fotos e colapsa espaços, preservando HTML inline
function cleanHTML(el) {
  if (!el) return "";
  const clone = el.cloneNode(true);
  clone.querySelectorAll("button.fotos, .fotos").forEach((b) => b.remove());
  return clone.innerHTML.replace(/\s+/g, " ").trim();
}

// ---- meta ----
const eyebrow = txt(doc.querySelector(".eyebrow"));
const title = txt(doc.querySelector("h1"));
const standfirst = (doc.querySelector(".standfirst")?.innerHTML ?? "").replace(/\s+/g, " ").trim();

// ---- blocos ----
const blocks = [];
doc.querySelectorAll(".chip[data-group]").forEach((btn) => {
  const id = btn.getAttribute("data-group");
  if (id === "all") return;
  if (!blocks.some((b) => b.id === id)) blocks.push({ id, name: txt(btn) });
});

// ---- agentes ----
const agents = [];
const colorToId = {};
doc.querySelectorAll("thead th[data-agent]").forEach((th) => {
  const color = Number(th.getAttribute("data-agent"));
  const id = th.querySelector(".fotos")?.getAttribute("data-fotos") || `ag${color}`;
  colorToId[color] = id;
  agents.push({ id, sci: txt(th.querySelector(".sci")), common: txt(th.querySelector(".cmn")), color });
});

// ---- linhas ----
const rows = [];
doc.querySelectorAll("tbody tr").forEach((tr) => {
  const group = tr.getAttribute("data-group");
  const block = group && group !== "base" ? group : undefined;
  const labelEl = tr.querySelector('th[scope="row"]');
  if (!labelEl) return;
  const label = txt(labelEl);
  const cells = {};
  tr.querySelectorAll("td[data-agent]").forEach((td) => {
    const color = Number(td.getAttribute("data-agent"));
    const id = colorToId[color];
    if (!id) return;
    const html = cleanHTML(td);
    const cell = { html };
    if (td.hasAttribute("data-key")) cell.key = true;
    cells[id] = cell;
  });
  rows.push(block ? { label, block, cells } : { label, cells });
});

// ---- seções ----
const sections = [];
doc.querySelectorAll("section").forEach((sec) => {
  if (sec.closest("#fotoModal")) return;
  const h2 = sec.querySelector("h2");
  const sectionTitle = txt(h2);
  const sub = (sec.querySelector(".sub")?.innerHTML ?? "").replace(/\s+/g, " ").trim() || undefined;

  if (sec.querySelector(".key-grid")) {
    const cards = [];
    sec.querySelectorAll(".key-card").forEach((card) => {
      const agent = card.getAttribute("data-agent") ? Number(card.getAttribute("data-agent")) : undefined;
      const items = Array.from(card.querySelectorAll("li")).map((li) => cleanHTML(li));
      cards.push({ ...(agent ? { agent } : {}), title: txt(card.querySelector("h3")), items });
    });
    sections.push({ type: "keygrid", title: sectionTitle || undefined, sub, cards });
  } else if (sec.querySelector(".callout")) {
    const callouts = [];
    sec.querySelectorAll(".callout").forEach((co) => {
      const alert = co.classList.contains("alert");
      const lis = Array.from(co.querySelectorAll("li"));
      const items = lis.length ? lis.map((li) => cleanHTML(li)) : [cleanHTML(co.querySelector("p") || co)];
      callouts.push({ ...(alert ? { alert: true } : {}), title: txt(co.querySelector("h3")), items });
    });
    sections.push({ type: "callouts", title: sectionTitle || undefined, sub, callouts });
  } else {
    const clone = sec.cloneNode(true);
    clone.querySelectorAll("h2, .sub, button.fotos, .fotos").forEach((n) => n.remove());
    const html = clone.innerHTML.replace(/\s+/g, " ").trim();
    if (html) sections.push({ type: "html", title: sectionTitle || undefined, sub, html });
  }
});

// footer -> seção "Fontes"
const footer = doc.querySelector("footer");
if (footer) {
  const clone = footer.cloneNode(true);
  clone.querySelectorAll(".signature").forEach((n) => n.remove());
  const html = clone.innerHTML.replace(/\s+/g, " ").trim();
  if (html) sections.push({ type: "html", title: "Fontes e créditos", html });
}

// ---- fotos ----
const EXT = { "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const photos = [];
const outDir = path.join(ROOT, "public", "fotos", slug);
fs.mkdirSync(outDir, { recursive: true });
// Normaliza as duas formas conhecidas em [{label, src, caption}]
function figuresOf(data) {
  if (Array.isArray(data)) {
    // forma entérica: [title, label, src, caption] (figura única)
    return [{ label: data[1] || data[0] || "", src: data[2] || "", caption: data[3] || "" }];
  }
  if (data && Array.isArray(data.f)) {
    // forma respiratória: { t, s, f:[{n, src, pt}] }
    return data.f.map((fig) => ({ label: fig.n || "", src: fig.src || "", caption: fig.pt || "" }));
  }
  return [];
}

for (const [key, data] of Object.entries(FOTOS)) {
  figuresOf(data).forEach((fig, i) => {
    const m = /^data:(image\/[a-z]+);base64,(.+)$/i.exec(fig.src);
    if (!m) return;
    const ext = EXT[m[1].toLowerCase()] || "jpg";
    const fname = `${key}-${i + 1}.${ext}`;
    fs.writeFileSync(path.join(outDir, fname), Buffer.from(m[2], "base64"));
    photos.push({
      group: key,
      src: `/fotos/${slug}/${fname}`,
      ...(fig.label ? { label: fig.label } : {}),
      ...(fig.caption ? { caption: fig.caption } : {}),
    });
  });
}

const page = {
  slug,
  topic,
  type: "matrix",
  title,
  ...(eyebrow ? { eyebrow } : {}),
  ...(standfirst ? { standfirst } : {}),
  agents,
  blocks,
  rows,
  ...(sections.length ? { sections } : {}),
  ...(photos.length ? { photos } : {}),
  updatedAt: new Date().toISOString(),
};

const outFile = path.join(ROOT, "content", "pages", `${slug}.json`);
fs.writeFileSync(outFile, JSON.stringify(page, null, 2) + "\n");
console.log(`OK ${slug}: ${agents.length} agentes, ${rows.length} linhas, ${sections.length} seções, ${photos.length} fotos`);
console.log(`  -> ${outFile}`);
console.log(`  -> ${photos.length} imagens em public/fotos/${slug}/`);
