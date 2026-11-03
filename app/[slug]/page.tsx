import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getPage, getPageSlugs, getTopics } from "@/lib/content";
import { Matrix } from "@/components/Matrix";
import { ArticleView } from "@/components/ArticleView";
import type { Section } from "@/lib/types";

export async function generateStaticParams() {
  const slugs = await getPageSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return {};
  return { title: page.title, description: page.standfirst };
}

function SectionBlock({ section }: { section: Section }) {
  if (section.type === "keygrid") {
    return (
      <section className="block">
        {section.title && <h2>{section.title}</h2>}
        {section.sub && <p className="sub">{section.sub}</p>}
        <div className="key-grid">
          {(section.cards ?? []).map((c, i) => (
            <div className="key-card" key={i} data-agent={c.agent}>
              <h3>{c.title}</h3>
              <ul>
                {c.items.map((it, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: it }} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    );
  }
  if (section.type === "callouts") {
    return (
      <section className="block">
        {section.title && <h2>{section.title}</h2>}
        {section.sub && <p className="sub">{section.sub}</p>}
        <div className="duo">
          {(section.callouts ?? []).map((c, i) => (
            <div className={`callout${c.alert ? " alert" : ""}`} key={i}>
              <h3>{c.title}</h3>
              <ul>
                {c.items.map((it, j) => (
                  <li key={j} dangerouslySetInnerHTML={{ __html: it }} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    );
  }
  // html
  return (
    <section className="block">
      {section.title && <h2>{section.title}</h2>}
      {section.sub && <p className="sub">{section.sub}</p>}
      {section.html && <div dangerouslySetInnerHTML={{ __html: section.html }} />}
    </section>
  );
}

export default async function PageView({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) notFound();

  const topics = await getTopics();
  const topic = topics.find((t) => t.slug === page.topic);

  return (
    <>
      <header className="masthead">
        {page.eyebrow && <p className="eyebrow">{page.eyebrow}</p>}
        <h1>{page.title}</h1>
        {page.standfirst && (
          <p className="standfirst" dangerouslySetInnerHTML={{ __html: page.standfirst }} />
        )}
        {topic && (
          <p className="sub" style={{ marginTop: 12 }}>
            <Link href={`/topico/${topic.slug}`} style={{ color: "var(--accent)" }}>
              ← {topic.name}
            </Link>
          </p>
        )}
      </header>

      {page.type === "matrix" ? (
        <Matrix
          agents={page.agents ?? []}
          blocks={page.blocks ?? []}
          rows={page.rows ?? []}
          photos={page.photos ?? []}
        />
      ) : (
        <div style={{ marginTop: 24 }}>
          <ArticleView body={page.body ?? ""} />
        </div>
      )}

      {(page.sections ?? []).map((s, i) => (
        <SectionBlock key={i} section={s} />
      ))}

      {page.type === "matrix" && <p className="byline">Produzido por Franciele Mielke</p>}
    </>
  );
}
