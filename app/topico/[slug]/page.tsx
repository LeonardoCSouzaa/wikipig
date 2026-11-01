import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getTopics, getPagesByTopic } from "@/lib/content";

export async function generateStaticParams() {
  const topics = await getTopics();
  return topics.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: PageProps<"/topico/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const topic = (await getTopics()).find((t) => t.slug === slug);
  if (!topic) return {};
  return { title: topic.name, description: topic.description };
}

export default async function TopicView({ params }: PageProps<"/topico/[slug]">) {
  const { slug } = await params;
  const topics = await getTopics();
  const topic = topics.find((t) => t.slug === slug);
  if (!topic) notFound();

  const children = topics.filter((t) => t.parent === topic.slug);
  const pages = await getPagesByTopic(topic.slug);

  return (
    <>
      <header className="masthead">
        <p className="eyebrow">Tópico</p>
        <h1>{topic.name}</h1>
        {topic.description && <p className="standfirst">{topic.description}</p>}
      </header>

      {children.length > 0 && (
        <section className="block">
          <h2>Subtópicos</h2>
          <div className="card-grid">
            {children.map((c) => (
              <Link key={c.slug} href={`/topico/${c.slug}`} className="page-card">
                <span className="pc-kind">{topic.name}</span>
                <span className="pc-title">{c.name}</span>
                {c.description && <span className="pc-desc">{c.description}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="block">
        <h2>Páginas</h2>
        {pages.length === 0 ? (
          <p className="sub">Nenhuma página neste tópico ainda.</p>
        ) : (
          <div className="card-grid">
            {pages.map((p) => (
              <Link key={p.slug} href={`/${p.slug}`} className="page-card">
                <span className="pc-kind">{p.type === "matrix" ? "Matriz comparativa" : "Artigo"}</span>
                <span className="pc-title">{p.title}</span>
                {p.standfirst && <span className="pc-desc">{p.standfirst}</span>}
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
