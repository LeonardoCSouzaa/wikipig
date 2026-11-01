"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { SearchDoc } from "@/lib/types";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[.,]/g, "");
}

interface Hit {
  doc: SearchDoc;
  score: number;
  snippet: string;
}

function makeSnippet(text: string, termNorm: string): string {
  const hay = norm(text);
  const idx = hay.indexOf(termNorm);
  if (idx === -1) return text.slice(0, 160);
  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + termNorm.length + 100);
  return (start > 0 ? "… " : "") + text.slice(start, end) + (end < text.length ? " …" : "");
}

export function SearchResults({ index }: { index: SearchDoc[] }) {
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") ?? "");

  const term = q.trim();
  const termNorm = norm(term);

  const hits: Hit[] = useMemo(() => {
    if (termNorm.length < 2) return [];
    return index
      .map((doc) => {
        const hay = norm(`${doc.title} ${doc.text}`);
        let score = 0;
        let pos = hay.indexOf(termNorm);
        while (pos !== -1) {
          score++;
          pos = hay.indexOf(termNorm, pos + termNorm.length);
        }
        if (norm(doc.title).includes(termNorm)) score += 5;
        return { doc, score, snippet: makeSnippet(doc.text, termNorm) };
      })
      .filter((h) => h.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [index, termNorm]);

  function renderSnippet(snippet: string) {
    if (termNorm.length < 2) return snippet;
    const hay = norm(snippet);
    const out: React.ReactNode[] = [];
    let pos = 0;
    let idx = hay.indexOf(termNorm);
    let k = 0;
    while (idx !== -1) {
      if (idx > pos) out.push(snippet.slice(pos, idx));
      out.push(
        <mark className="hit" key={k++}>
          {snippet.slice(idx, idx + termNorm.length)}
        </mark>
      );
      pos = idx + termNorm.length;
      idx = hay.indexOf(termNorm, pos);
    }
    if (pos < snippet.length) out.push(snippet.slice(pos));
    return out;
  }

  return (
    <>
      <header className="masthead">
        <p className="eyebrow">Busca</p>
        <h1>Buscar no WikiPig</h1>
      </header>

      <div className="controls">
        <div className="ctl-group" style={{ flex: 1 }}>
          <label className="ctl-label" htmlFor="globalSearch">
            Termo
          </label>
          <div className="search-wrap">
            <svg className="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              id="globalSearch"
              type="search"
              className="search-box"
              placeholder="ex.: diarreia, cianose, pleurite…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
            <button type="button" className="search-clear" hidden={!q} aria-label="Limpar" onClick={() => setQ("")}>
              ×
            </button>
          </div>
          <p className="search-count">
            {termNorm.length < 2
              ? "Digite ao menos 2 caracteres."
              : `${hits.length} ${hits.length === 1 ? "resultado" : "resultados"}`}
          </p>
        </div>
      </div>

      <section className="block" style={{ marginTop: 20 }}>
        {hits.length > 0 && (
          <div className="card-grid">
            {hits.map((h) => (
              <Link key={h.doc.slug} href={`/${h.doc.slug}`} className="page-card">
                <span className="pc-kind">{h.doc.type === "matrix" ? "Matriz" : "Artigo"}</span>
                <span className="pc-title">{h.doc.title}</span>
                <span className="pc-desc">{renderSnippet(h.snippet)}</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
