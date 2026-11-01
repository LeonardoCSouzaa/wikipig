"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Falha no login.");
    }
  }

  return (
    <>
      <header className="masthead">
        <p className="eyebrow">Área restrita</p>
        <h1>Entrar para editar</h1>
        <p className="standfirst">A edição de conteúdo exige autenticação. A consulta é pública.</p>
      </header>

      <form onSubmit={submit} className="block" style={{ maxWidth: 360 }}>
        <div className="ctl-group" style={{ gap: 10 }}>
          <label className="ctl-label" htmlFor="pw">
            Senha
          </label>
          <input
            id="pw"
            type="password"
            className="search-box"
            style={{ paddingInline: 12 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
          />
          {error && (
            <p className="search-count" style={{ color: "var(--warn-line)" }}>
              {error}
            </p>
          )}
          <button type="submit" className="btn primary" disabled={loading} style={{ marginTop: 6, justifyContent: "center" }}>
            {loading ? "Entrando…" : "Entrar"}
          </button>
        </div>
      </form>
    </>
  );
}
