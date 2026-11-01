"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Agent, Block, MatrixRow, Photo } from "@/lib/types";

interface MatrixProps {
  agents: Agent[];
  blocks: Block[];
  rows: MatrixRow[];
  photos?: Photo[];
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // tira acento
    .replace(/[.,]/g, ""); // 41,5 == 415 == 41.5
}

/** Realça termo dentro dos nós de texto, preservando <b>/<em>/<br>, ignorando <button>. */
function highlight(el: HTMLElement, termNorm: string): boolean {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const p = n.parentElement;
      return p && p.closest("button") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes: Text[] = [];
  let n: Node | null;
  while ((n = walker.nextNode())) nodes.push(n as Text);

  let hit = false;
  for (const node of nodes) {
    const txt = node.nodeValue ?? "";
    const hay = norm(txt);
    let idx = hay.indexOf(termNorm);
    if (idx === -1) continue;
    hit = true;
    const frag = document.createDocumentFragment();
    let pos = 0;
    while (idx !== -1) {
      if (idx > pos) frag.appendChild(document.createTextNode(txt.slice(pos, idx)));
      const mk = document.createElement("mark");
      mk.className = "hit";
      mk.textContent = txt.slice(idx, idx + termNorm.length);
      frag.appendChild(mk);
      pos = idx + termNorm.length;
      idx = hay.indexOf(termNorm, pos);
    }
    if (pos < txt.length) frag.appendChild(document.createTextNode(txt.slice(pos)));
    node.parentNode?.replaceChild(frag, node);
  }
  return hit;
}

export function Matrix({ agents, blocks, rows, photos = [] }: MatrixProps) {
  const [visible, setVisible] = useState<Set<string>>(() => new Set(agents.map((a) => a.id)));
  const [group, setGroup] = useState<string>("all");
  const [flagged, setFlagged] = useState(true);
  const [compare, setCompare] = useState(false);
  const [query, setQuery] = useState("");
  const [photoKey, setPhotoKey] = useState<string | null>(null);
  const [count, setCount] = useState("");

  const wrapRef = useRef<HTMLDivElement>(null);

  const visibleOrder = useMemo(() => agents.filter((a) => visible.has(a.id)), [agents, visible]);

  function toggleAgent(id: string) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (compare) {
        // modo comparar 2: mantém no máximo 2, FIFO
        if (next.has(id)) {
          if (next.size <= 1) return next;
          next.delete(id);
        } else {
          const on = agents.filter((a) => next.has(a.id)).map((a) => a.id);
          if (on.length >= 2) next.delete(on[0]);
          next.add(id);
        }
      } else {
        if (next.has(id)) {
          if (next.size <= 1) return next;
          next.delete(id);
        } else next.add(id);
      }
      return next;
    });
  }

  function toggleCompare() {
    setCompare((prev) => {
      const nextMode = !prev;
      if (nextMode) {
        setVisible((v) => {
          const on = agents.filter((a) => v.has(a.id)).map((a) => a.id);
          return new Set(on.slice(0, 2).length ? on.slice(0, 2) : agents.slice(0, 2).map((a) => a.id));
        });
      } else {
        setVisible(new Set(agents.map((a) => a.id)));
      }
      return nextMode;
    });
  }

  function reset() {
    setCompare(false);
    setVisible(new Set(agents.map((a) => a.id)));
    setGroup("all");
    setQuery("");
  }

  function rowVisible(r: MatrixRow): boolean {
    if (group === "all") return true;
    if (!r.block || r.block === "base") return true;
    return r.block === group;
  }

  // Busca: realça só os spans de texto marcados com data-html (nunca os botões).
  useEffect(() => {
    const root = wrapRef.current;
    if (!root) return;
    const searchables = Array.from(root.querySelectorAll<HTMLElement>("[data-html]"));
    for (const el of searchables) el.innerHTML = el.getAttribute("data-html") ?? el.innerHTML;
    root.querySelectorAll(".dimcol").forEach((el) => el.classList.remove("dimcol"));

    const raw = query.trim();
    if (raw.length < 2) {
      setCount("");
      return;
    }
    const t = norm(raw);
    const byAgent: Record<string, boolean> = {};
    let nCel = 0,
      nLin = 0;

    for (const el of searchables) {
      if (el.closest(".hidecol") || el.closest("tr")?.hidden) continue;
      if (!highlight(el, t)) continue;
      const kind = el.dataset.kind;
      if (kind === "cell") {
        nCel++;
        if (el.dataset.agent) byAgent[el.dataset.agent] = true;
      } else if (kind === "agenthead") {
        if (el.dataset.agent) byAgent[el.dataset.agent] = true;
      } else if (kind === "label") {
        nLin++;
      }
    }

    const cols = Object.keys(byAgent).length;
    if (cols) {
      for (const a of agents) {
        if (byAgent[String(a.color)]) continue;
        root.querySelectorAll(`td[data-agent="${a.color}"], th[data-agent="${a.color}"]`).forEach((el) =>
          el.classList.add("dimcol")
        );
      }
    }

    const partes: string[] = [];
    if (nCel) partes.push(`${nCel}${nCel === 1 ? " célula" : " células"}`);
    if (cols) partes.push(`${cols}${cols === 1 ? " agente" : " agentes"}`);
    if (nLin) partes.push(`${nLin}${nLin === 1 ? " linha" : " linhas"}`);
    setCount(partes.length ? partes.join(" · ") : "sem resultado");
  }, [query, visibleOrder, group, agents]);

  const photoGroups = useMemo(() => {
    const map = new Map<string, Photo[]>();
    for (const p of photos) {
      if (!map.has(p.group)) map.set(p.group, []);
      map.get(p.group)!.push(p);
    }
    return map;
  }, [photos]);

  const modalPhotos = photoKey ? photoGroups.get(photoKey) ?? [] : [];

  return (
    <div className={flagged ? "flagged" : undefined} ref={wrapRef}>
      <div className="controls">
        <div className="ctl-row">
          <div className="ctl-group">
            <span className="ctl-label">Agentes na comparação</span>
            <div className="chips" role="group">
              {agents.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="chip"
                  data-agent={a.color}
                  aria-pressed={visible.has(a.id)}
                  onClick={() => toggleAgent(a.id)}
                >
                  <span className="dot" />
                  {a.common}
                </button>
              ))}
            </div>
          </div>

          {blocks.length > 0 && (
            <div className="ctl-group">
              <span className="ctl-label">Bloco</span>
              <div className="chips" role="group">
                <button type="button" className="chip seg" aria-pressed={group === "all"} onClick={() => setGroup("all")}>
                  Tudo
                </button>
                {blocks.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    className="chip seg"
                    aria-pressed={group === b.id}
                    onClick={() => setGroup(b.id)}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="ctl-group">
            <span className="ctl-label">Realce e atalhos</span>
            <div className="chips" role="group">
              <button type="button" className="chip" aria-pressed={flagged} onClick={() => setFlagged((v) => !v)}>
                Discriminadores decisivos
              </button>
              <button type="button" className="chip" aria-pressed={compare} onClick={toggleCompare}>
                Comparar 2
              </button>
              <button type="button" className="chip" onClick={reset}>
                Mostrar todos
              </button>
            </div>
          </div>

          <div className="ctl-group" style={{ flex: "1 1 230px" }}>
            <label className="ctl-label" htmlFor="matrixSearch">
              Buscar achado ou sintoma
            </label>
            <div className="search-wrap">
              <svg className="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                id="matrixSearch"
                type="search"
                className="search-box"
                placeholder="ex.: cianose, pleurite, 41,5"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
              <button type="button" className="search-clear" hidden={!query} aria-label="Limpar busca" onClick={() => setQuery("")}>
                ×
              </button>
            </div>
            <p className="search-count" role="status" aria-live="polite">
              {count}
            </p>
          </div>
        </div>
      </div>

      <div className="matrix-wrap">
        <table className="matrix">
          <thead>
            <tr>
              <th scope="col">
                <span className="th-txt" data-html="Característica" data-kind="label">
                  Característica
                </span>
                {photoGroups.has("padroes") && (
                  <button type="button" className="fotos" onClick={() => setPhotoKey("padroes")}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    Comparativo
                  </button>
                )}
              </th>
              {agents.map((a) => (
                <th
                  key={a.id}
                  scope="col"
                  data-agent={a.color}
                  className={visible.has(a.id) ? undefined : "hidecol"}
                >
                  <span
                    className="th-txt"
                    data-kind="agenthead"
                    data-agent={a.color}
                    data-html={`<span class="sci">${a.sci}</span><span class="cmn">${a.common}</span>`}
                  >
                    <span className="sci">{a.sci}</span>
                    <span className="cmn">{a.common}</span>
                  </span>
                  {photoGroups.has(a.id) && (
                    <button type="button" className="fotos" onClick={() => setPhotoKey(a.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                        <rect x="3" y="5" width="18" height="14" rx="2" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      Ver {photoGroups.get(a.id)!.length}{" "}
                      {photoGroups.get(a.id)!.length === 1 ? "foto" : "fotos"}
                    </button>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} hidden={!rowVisible(r)}>
                <th scope="row">
                  <span className="th-txt" data-html={r.label} data-kind="label">
                    {r.label}
                  </span>
                </th>
                {agents.map((a) => {
                  const cell = r.cells[a.id];
                  const html = cell?.html ?? "—";
                  return (
                    <td
                      key={a.id}
                      data-agent={a.color}
                      data-kind="cell"
                      className={visible.has(a.id) ? undefined : "hidecol"}
                      data-key={cell?.key ? "" : undefined}
                      data-html={html}
                      dangerouslySetInnerHTML={{ __html: html }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="scrollhint">Role na horizontal para ver todos os agentes →</p>

      {photoKey && (
        <div className="foto-modal" onClick={(e) => e.target === e.currentTarget && setPhotoKey(null)}>
          <div className="fm-box" role="dialog" aria-modal="true">
            <div className="fm-head">
              <div>
                <p className="fm-title">
                  {agents.find((a) => a.id === photoKey)?.sci ?? "Fotos"}
                </p>
                <p className="fm-sub">{modalPhotos.length} imagem{modalPhotos.length === 1 ? "" : "s"}</p>
              </div>
              <button type="button" className="fm-close" aria-label="Fechar" onClick={() => setPhotoKey(null)}>
                ×
              </button>
            </div>
            {modalPhotos.map((p, i) => (
              <figure className="fm-fig" key={i}>
                {p.label && <p className="fm-n">{p.label}</p>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="fm-img" src={p.src} alt={p.label ?? ""} />
                {p.caption && <figcaption className="fm-cap">{p.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
