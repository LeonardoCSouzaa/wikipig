"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { Agent, AgentColor, Block, MatrixRow, Page, PageType, Topic } from "@/lib/types";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const COLORS: AgentColor[] = [1, 2, 3, 4, 5, 6, 7, 8];

interface Props {
  initial: Page | null;
  topics: Topic[];
}

export function PageEditor({ initial, topics }: Props) {
  const router = useRouter();
  const isNew = !initial;
  const oldSlug = initial?.slug;

  const leafTopics = topics.filter((t) => topics.some((x) => x.parent === t.slug) === false);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [topic, setTopic] = useState(initial?.topic ?? leafTopics[0]?.slug ?? topics[0]?.slug ?? "");
  const [type, setType] = useState<PageType>(initial?.type ?? "matrix");
  const [eyebrow, setEyebrow] = useState(initial?.eyebrow ?? "");
  const [standfirst, setStandfirst] = useState(initial?.standfirst ?? "");

  // artigo
  const [body, setBody] = useState(initial?.body ?? "");

  // matriz
  const [agents, setAgents] = useState<Agent[]>(initial?.agents ?? []);
  const [blocks, setBlocks] = useState<Block[]>(initial?.blocks ?? []);
  const [rows, setRows] = useState<MatrixRow[]>(initial?.rows ?? []);
  const [sectionsJson, setSectionsJson] = useState(
    initial?.sections ? JSON.stringify(initial.sections, null, 2) : ""
  );
  const [photosJson, setPhotosJson] = useState(
    initial?.photos ? JSON.stringify(initial.photos, null, 2) : ""
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const effectiveSlug = useMemo(() => (slugTouched ? slug : slugify(title)), [slug, slugTouched, title]);

  // ----- agents -----
  function addAgent() {
    const usedColors = new Set(agents.map((a) => a.color));
    const color = COLORS.find((c) => !usedColors.has(c)) ?? 1;
    const id = `ag${Date.now().toString(36)}`;
    setAgents((a) => [...a, { id, sci: "", common: "", color }]);
  }
  function updateAgent(id: string, patch: Partial<Agent>) {
    setAgents((a) => a.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function removeAgent(id: string) {
    setAgents((a) => a.filter((x) => x.id !== id));
    setRows((rs) =>
      rs.map((r) => {
        const cells = { ...r.cells };
        delete cells[id];
        return { ...r, cells };
      })
    );
  }

  // ----- blocks -----
  function addBlock() {
    const id = `b${Date.now().toString(36)}`;
    setBlocks((b) => [...b, { id, name: "" }]);
  }
  function updateBlock(id: string, patch: Partial<Block>) {
    setBlocks((b) => b.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function removeBlock(id: string) {
    setBlocks((b) => b.filter((x) => x.id !== id));
    setRows((rs) => rs.map((r) => (r.block === id ? { ...r, block: undefined } : r)));
  }

  // ----- rows -----
  function addRow() {
    setRows((rs) => [...rs, { label: "", block: blocks[0]?.id, cells: {} }]);
  }
  function updateRow(i: number, patch: Partial<MatrixRow>) {
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }
  function updateCell(i: number, agentId: string, patch: { html?: string; key?: boolean }) {
    setRows((rs) =>
      rs.map((r, j) => {
        if (j !== i) return r;
        const prev = r.cells[agentId] ?? { html: "" };
        return { ...r, cells: { ...r.cells, [agentId]: { ...prev, ...patch } } };
      })
    );
  }
  function removeRow(i: number) {
    setRows((rs) => rs.filter((_, j) => j !== i));
  }
  function moveRow(i: number, dir: -1 | 1) {
    setRows((rs) => {
      const j = i + dir;
      if (j < 0 || j >= rs.length) return rs;
      const copy = [...rs];
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });
  }

  async function save() {
    setError("");
    const s = effectiveSlug;
    if (!title.trim()) return setError("Título obrigatório.");
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) return setError("Slug inválido.");
    if (!topic) return setError("Escolha um tópico.");

    let sections, photos;
    if (type === "matrix") {
      try {
        sections = sectionsJson.trim() ? JSON.parse(sectionsJson) : undefined;
      } catch {
        return setError("JSON de seções inválido.");
      }
      try {
        photos = photosJson.trim() ? JSON.parse(photosJson) : undefined;
      } catch {
        return setError("JSON de fotos inválido.");
      }
    }

    const page: Page = {
      slug: s,
      topic,
      type,
      title: title.trim(),
      eyebrow: eyebrow.trim() || undefined,
      standfirst: standfirst.trim() || undefined,
      ...(type === "article"
        ? { body }
        : { agents, blocks, rows, sections, photos }),
    };

    setSaving(true);
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page, oldSlug }),
    });
    setSaving(false);
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Falha ao salvar.");
    }
  }

  const field: React.CSSProperties = {
    width: "100%",
    background: "var(--surface)",
    border: "1px solid var(--line)",
    color: "var(--fg)",
    borderRadius: 2,
    padding: "7px 10px",
    fontFamily: "var(--font-body)",
    fontSize: 14,
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: "var(--fg-dim)",
    display: "block",
    marginBottom: 4,
  };

  return (
    <>
      <header className="masthead">
        <p className="eyebrow">{isNew ? "Nova página" : "Editar página"}</p>
        <h1>{title || "Sem título"}</h1>
      </header>

      <div className="block" style={{ display: "grid", gap: 16, maxWidth: 820 }}>
        {/* ---- meta ---- */}
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Título</label>
            <input style={field} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Slug (URL)</label>
            <input
              style={field}
              value={effectiveSlug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
            />
          </div>
          <div>
            <label style={labelStyle}>Tópico</label>
            <select style={field} value={topic} onChange={(e) => setTopic(e.target.value)}>
              {topics.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.parent ? `— ${t.name}` : t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Tipo</label>
            <select style={field} value={type} onChange={(e) => setType(e.target.value as PageType)}>
              <option value="matrix">Matriz comparativa</option>
              <option value="article">Artigo (texto livre)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Eyebrow (linha acima do título)</label>
            <input style={field} value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Standfirst (resumo, HTML permitido)</label>
            <textarea style={{ ...field, minHeight: 60 }} value={standfirst} onChange={(e) => setStandfirst(e.target.value)} />
          </div>
        </div>

        {/* ---- artigo ---- */}
        {type === "article" && (
          <div>
            <label style={labelStyle}>Conteúdo (Markdown)</label>
            <textarea
              style={{ ...field, minHeight: 340, fontFamily: "var(--font-mono)", fontSize: 13 }}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="# Título&#10;&#10;Texto em **markdown**…"
            />
          </div>
        )}

        {/* ---- matriz ---- */}
        {type === "matrix" && (
          <>
            {/* agentes */}
            <section>
              <h2 style={{ fontSize: 18 }}>Agentes (colunas)</h2>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {agents.map((a) => (
                  <div key={a.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px 80px", gap: 8, alignItems: "end" }}>
                    <div>
                      <label style={labelStyle}>Nome científico</label>
                      <input style={field} value={a.sci} onChange={(e) => updateAgent(a.id, { sci: e.target.value })} />
                    </div>
                    <div>
                      <label style={labelStyle}>Nome comum</label>
                      <input style={field} value={a.common} onChange={(e) => updateAgent(a.id, { common: e.target.value })} />
                    </div>
                    <div>
                      <label style={labelStyle}>Cor</label>
                      <select style={field} value={a.color} onChange={(e) => updateAgent(a.id, { color: Number(e.target.value) as AgentColor })}>
                        {COLORS.map((c) => (
                          <option key={c} value={c}>
                            Cor {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button type="button" className="btn" onClick={() => removeAgent(a.id)}>
                      Remover
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn" onClick={addAgent} style={{ marginTop: 8 }}>
                + Agente
              </button>
            </section>

            {/* blocos */}
            <section>
              <h2 style={{ fontSize: 18 }}>Blocos (grupos de linhas)</h2>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                {blocks.map((b) => (
                  <div key={b.id} style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8, alignItems: "end" }}>
                    <div>
                      <label style={labelStyle}>Nome do bloco</label>
                      <input style={field} value={b.name} onChange={(e) => updateBlock(b.id, { name: e.target.value })} />
                    </div>
                    <button type="button" className="btn" onClick={() => removeBlock(b.id)}>
                      Remover
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" className="btn" onClick={addBlock} style={{ marginTop: 8 }}>
                + Bloco
              </button>
            </section>

            {/* linhas */}
            <section>
              <h2 style={{ fontSize: 18 }}>Linhas (características)</h2>
              {agents.length === 0 && <p className="sub">Adicione agentes primeiro.</p>}
              <div style={{ display: "grid", gap: 16, marginTop: 8 }}>
                {rows.map((r, i) => (
                  <div key={i} style={{ border: "1px solid var(--line)", padding: 12, background: "var(--surface)" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 180px auto auto auto", gap: 8, alignItems: "end" }}>
                      <div>
                        <label style={labelStyle}>Característica</label>
                        <input style={field} value={r.label} onChange={(e) => updateRow(i, { label: e.target.value })} />
                      </div>
                      <div>
                        <label style={labelStyle}>Bloco</label>
                        <select style={field} value={r.block ?? ""} onChange={(e) => updateRow(i, { block: e.target.value || undefined })}>
                          <option value="">(nenhum)</option>
                          {blocks.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name || b.id}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button type="button" className="btn" onClick={() => moveRow(i, -1)} aria-label="Subir">
                        ↑
                      </button>
                      <button type="button" className="btn" onClick={() => moveRow(i, 1)} aria-label="Descer">
                        ↓
                      </button>
                      <button type="button" className="btn" onClick={() => removeRow(i)}>
                        Excluir
                      </button>
                    </div>
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {agents.map((a) => (
                        <div key={a.id}>
                          <label style={labelStyle}>
                            <span className={`ag-fg-${a.color}`}>{a.common || a.sci || a.id}</span>
                            <label style={{ marginLeft: 10, textTransform: "none", letterSpacing: 0 }}>
                              <input
                                type="checkbox"
                                checked={!!r.cells[a.id]?.key}
                                onChange={(e) => updateCell(i, a.id, { key: e.target.checked })}
                              />{" "}
                              discriminador
                            </label>
                          </label>
                          <textarea
                            style={{ ...field, minHeight: 54 }}
                            value={r.cells[a.id]?.html ?? ""}
                            onChange={(e) => updateCell(i, a.id, { html: e.target.value })}
                            placeholder="Texto (HTML inline: <b>, <em>)"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="btn" onClick={addRow} style={{ marginTop: 8 }} disabled={agents.length === 0}>
                + Linha
              </button>
            </section>

            {/* avançado */}
            <section>
              <h2 style={{ fontSize: 18 }}>Seções extras (JSON, opcional)</h2>
              <p className="sub">Chave de decisão, callouts etc. Deixe vazio se não usar.</p>
              <textarea
                style={{ ...field, minHeight: 120, fontFamily: "var(--font-mono)", fontSize: 12 }}
                value={sectionsJson}
                onChange={(e) => setSectionsJson(e.target.value)}
                placeholder='[ { "type": "keygrid", "title": "…", "cards": [ … ] } ]'
              />
            </section>
            <section>
              <h2 style={{ fontSize: 18 }}>Fotos (JSON, opcional)</h2>
              <textarea
                style={{ ...field, minHeight: 90, fontFamily: "var(--font-mono)", fontSize: 12 }}
                value={photosJson}
                onChange={(e) => setPhotosJson(e.target.value)}
                placeholder='[ { "group": "<agentId>", "src": "/fotos/x.jpg", "label": "…", "caption": "…" } ]'
              />
            </section>
          </>
        )}

        {error && (
          <p className="search-count" style={{ color: "var(--warn-line)", fontSize: 13 }}>
            {error}
          </p>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn primary" onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar"}
          </button>
          <button type="button" className="btn" onClick={() => router.push("/admin")}>
            Cancelar
          </button>
        </div>
      </div>
    </>
  );
}
