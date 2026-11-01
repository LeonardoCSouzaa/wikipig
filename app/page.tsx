import Link from "next/link";
import { getTopicTree, getAllPages } from "@/lib/content";

export default async function Home() {
  const [tree, pages] = await Promise.all([getTopicTree(), getAllPages()]);

  return (
    <>
      <header className="masthead">
        <p className="eyebrow">Consulta veterinária · suínos</p>
        <h1>WikiPig</h1>
        <p className="standfirst">
          Base de <strong>diagnóstico diferencial</strong> em medicina veterinária de suínos. Compare agentes pelo que se
          vê em campo, na necropsia e no laboratório — ou busque um achado específico.
        </p>
      </header>

      {pages.length > 0 && (
        <section className="block">
          <h2>Páginas</h2>
          <p className="sub">Todo o conteúdo publicado.</p>
          <div className="card-grid">
            {pages.map((p) => (
              <Link key={p.slug} href={`/${p.slug}`} className="page-card">
                <span className="pc-kind">{p.type === "matrix" ? "Matriz comparativa" : "Artigo"}</span>
                <span className="pc-title">{p.title}</span>
                {p.standfirst && <span className="pc-desc">{p.standfirst}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="block">
        <h2>Tópicos</h2>
        <p className="sub">Navegue por sistema.</p>
        <div className="card-grid">
          {tree.flatMap((root) =>
            (root.children.length ? root.children : [root]).map((t) => (
              <Link key={t.slug} href={`/topico/${t.slug}`} className="page-card">
                <span className="pc-kind">{root.name}</span>
                <span className="pc-title">{t.name}</span>
                {t.description && <span className="pc-desc">{t.description}</span>}
              </Link>
            ))
          )}
        </div>
      </section>

      {pages.length === 0 && (
        <section className="block">
          <div className="callout">
            <h3>Comece por aqui</h3>
            <ul>
              <li>
                Entre em <b>/admin</b> para habilitar a edição e publicar a primeira página.
              </li>
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
