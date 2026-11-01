import "server-only";
import { promises as fs } from "fs";
// Conteúdo vem de arquivos estáticos; cacheia a leitura para permitir prerender.
import path from "path";
import type { Page, Topic, SearchDoc } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content");
const PAGES_DIR = path.join(CONTENT_DIR, "pages");

async function readJson<T>(file: string): Promise<T> {
  const raw = await fs.readFile(file, "utf8");
  return JSON.parse(raw) as T;
}

export async function getTopics(): Promise<Topic[]> {
  try {
    const topics = await readJson<Topic[]>(path.join(CONTENT_DIR, "topics.json"));
    return topics.sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

/** Tópicos raiz com seus filhos, para a navegação em árvore. */
export async function getTopicTree(): Promise<(Topic & { children: Topic[] })[]> {
  const topics = await getTopics();
  const roots = topics.filter((t) => !t.parent);
  return roots.map((r) => ({
    ...r,
    children: topics.filter((t) => t.parent === r.slug),
  }));
}

export async function getPageSlugs(): Promise<string[]> {
  try {
    const files = await fs.readdir(PAGES_DIR);
    return files.filter((f) => f.endsWith(".json")).map((f) => f.replace(/\.json$/, ""));
  } catch {
    return [];
  }
}

export async function getAllPages(): Promise<Page[]> {
  const slugs = await getPageSlugs();
  const pages = await Promise.all(slugs.map((s) => readJson<Page>(path.join(PAGES_DIR, `${s}.json`))));
  return pages.sort((a, b) => a.title.localeCompare(b.title));
}

export async function getPage(slug: string): Promise<Page | null> {
  try {
    return await readJson<Page>(path.join(PAGES_DIR, `${slug}.json`));
  } catch {
    return null;
  }
}

export async function getPagesByTopic(topicSlug: string): Promise<Page[]> {
  const pages = await getAllPages();
  return pages.filter((p) => p.topic === topicSlug);
}

/** Strip simples de tags HTML para texto de busca. */
function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function pageText(p: Page): string {
  const parts: string[] = [p.title, p.eyebrow ?? "", p.standfirst ?? ""];
  if (p.type === "article" && p.body) parts.push(p.body);
  if (p.agents) for (const a of p.agents) parts.push(a.sci, a.common);
  if (p.rows)
    for (const r of p.rows) {
      parts.push(r.label);
      for (const cell of Object.values(r.cells)) parts.push(cell.html);
    }
  if (p.sections)
    for (const s of p.sections) {
      if (s.title) parts.push(s.title);
      if (s.sub) parts.push(s.sub);
      if (s.html) parts.push(s.html);
      if (s.cards) for (const c of s.cards) parts.push(c.title, ...c.items);
      if (s.callouts) for (const c of s.callouts) parts.push(c.title, ...c.items);
    }
  return stripHtml(parts.join(" "));
}

/** Índice de busca gerado de todo o conteúdo (usado client-side). */
export async function getSearchIndex(): Promise<SearchDoc[]> {
  const pages = await getAllPages();
  return pages.map((p) => ({
    slug: p.slug,
    title: p.title,
    topic: p.topic,
    type: p.type,
    text: pageText(p),
  }));
}
