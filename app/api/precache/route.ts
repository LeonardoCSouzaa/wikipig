import { NextResponse } from "next/server";
import { getAllPages, getTopics } from "@/lib/content";

/**
 * Lista de URLs para o service worker baixar no install (acesso offline).
 * Mantida dinâmica: reflete páginas/tópicos atuais a cada novo install/update do SW.
 */
export async function GET() {
  const [pages, topics] = await Promise.all([getAllPages(), getTopics()]);

  const urls = new Set<string>(["/", "/busca"]);

  for (const t of topics) urls.add(`/topico/${t.slug}`);
  for (const p of pages) {
    urls.add(`/${p.slug}`);
    for (const photo of p.photos ?? []) {
      if (photo.src?.startsWith("/")) urls.add(photo.src);
    }
  }

  return NextResponse.json(
    { urls: [...urls] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
