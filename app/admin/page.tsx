import Link from "next/link";
import type { Metadata } from "next";
import { isAuthenticated } from "@/lib/auth";
import { STORAGE_MODE } from "@/lib/store";
import { getAllPages, getTopics } from "@/lib/content";
import { LoginForm } from "@/components/LoginForm";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { LogoutButton } from "@/components/admin/LogoutButton";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

export default async function AdminPage() {
  if (!(await isAuthenticated())) {
    return <LoginForm />;
  }

  const [pages, topics] = await Promise.all([getAllPages(), getTopics()]);
  const mode = STORAGE_MODE();

  return (
    <>
      <header className="masthead">
        <p className="eyebrow">Administração</p>
        <h1>Painel de edição</h1>
        <p className="standfirst">
          Gerencie páginas e tópicos. Armazenamento atual: <strong>{mode === "github" ? "GitHub (commit automático)" : "disco local"}</strong>.
        </p>
      </header>

      <div className="controls">
        <div className="chips">
          <Link href="/admin/new" className="btn primary">
            + Nova página
          </Link>
          <Link href="/admin/topicos" className="btn">
            Tópicos
          </Link>
          <LogoutButton />
        </div>
      </div>

      <section className="block">
        <h2>Páginas ({pages.length})</h2>
        {pages.length === 0 ? (
          <p className="sub">Nenhuma página ainda. Crie a primeira.</p>
        ) : (
          <ul className="nav-tree" style={{ marginTop: 8 }}>
            {pages.map((p) => (
              <li
                key={p.slug}
                style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--line-soft)" }}
              >
                <span style={{ minWidth: 0 }}>
                  <strong>{p.title}</strong>{" "}
                  <span className="pc-kind" style={{ marginLeft: 6 }}>
                    {p.type} · {p.topic}
                  </span>
                </span>
                <span style={{ display: "flex", gap: 6, flex: "none" }}>
                  <Link href={`/${p.slug}`} className="btn" target="_blank">
                    Ver
                  </Link>
                  <Link href={`/admin/edit/${p.slug}`} className="btn">
                    Editar
                  </Link>
                  <DeleteButton slug={p.slug} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="block">
        <h2>Tópicos ({topics.length})</h2>
        <p className="sub">
          <Link href="/admin/topicos" style={{ color: "var(--accent)" }}>
            Gerenciar tópicos →
          </Link>
        </p>
      </section>
    </>
  );
}
