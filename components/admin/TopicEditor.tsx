"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Topic } from "@/lib/types";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function TopicEditor({ initial }: { initial: Topic[] }) {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  function update(i: number, patch: Partial<Topic>) {
    setTopics((ts) => ts.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  }
  function add() {
    setTopics((ts) => [...ts, { slug: "", name: "", order: ts.length + 1 }]);
  }
  function remove(i: number) {
    setTopics((ts) => ts.filter((_, j) => j !== i));
  }

  async function save() {
    setError("");
    setMsg("");
    for (const t of topics) {
      if (!t.name.trim()) return setError("Todo tópico precisa de nome.");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(t.slug)) return setError(`Slug inválido: "${t.slug || "(vazio)"}"`);
    }
    setSaving(true);
    const res = await fetch("/api/topics", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topics }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Tópicos salvos.");
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
    padding: "6px 9px",
    fontSize: 13,
  };
  const labelStyle: React.CSSProperties = {
    fontFamily: "var(--font-mono)",
    fontSize: 10,
    letterSpacing: ".1em",
    textTransform: "uppercase",
    color: "var(--fg-dim)",
    display: "block",
    marginBottom: 3,
  };

  return (
    <>
      <header className="masthead">
        <p className="eyebrow">Administração</p>
        <h1>Tópicos</h1>
        <p className="standfirst">
          Tópicos organizam a navegação. Um tópico com <strong>pai</strong> vira subtópico. A <strong>ordem</strong> define a posição.
        </p>
      </header>

      <div className="block" style={{ display: "grid", gap: 12, maxWidth: 820 }}>
        {topics.map((t, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 70px 80px", gap: 8, alignItems: "end", borderBottom: "1px solid var(--line-soft)", paddingBottom: 12 }}>
            <div>
              <label style={labelStyle}>Nome</label>
              <input
                style={field}
                value={t.name}
                onChange={(e) => {
                  const name = e.target.value;
                  update(i, { name, ...(t.slug ? {} : { slug: slugify(name) }) });
                }}
              />
            </div>
            <div>
              <label style={labelStyle}>Slug</label>
              <input style={field} value={t.slug} onChange={(e) => update(i, { slug: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Pai</label>
              <select style={field} value={t.parent ?? ""} onChange={(e) => update(i, { parent: e.target.value || undefined })}>
                <option value="">(raiz)</option>
                {topics
                  .filter((x) => x.slug && x.slug !== t.slug)
                  .map((x) => (
                    <option key={x.slug} value={x.slug}>
                      {x.name || x.slug}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Ordem</label>
              <input
                style={field}
                type="number"
                value={t.order ?? 0}
                onChange={(e) => update(i, { order: Number(e.target.value) })}
              />
            </div>
            <button type="button" className="btn" onClick={() => remove(i)}>
              Remover
            </button>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Descrição</label>
              <input style={field} value={t.description ?? ""} onChange={(e) => update(i, { description: e.target.value || undefined })} />
            </div>
          </div>
        ))}

        <button type="button" className="btn" onClick={add}>
          + Tópico
        </button>

        {error && <p className="search-count" style={{ color: "var(--warn-line)", fontSize: 13 }}>{error}</p>}
        {msg && <p className="search-count" style={{ color: "var(--accent)", fontSize: 13 }}>{msg}</p>}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="btn primary" onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Salvar tópicos"}
          </button>
          <button type="button" className="btn" onClick={() => router.push("/admin")}>
            Voltar
          </button>
        </div>
      </div>
    </>
  );
}
