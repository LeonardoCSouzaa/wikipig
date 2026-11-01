"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import type { Topic } from "@/lib/types";
import { ThemeToggle } from "./ThemeToggle";

type TreeTopic = Topic & { children: Topic[] };

export function AppChrome({ tree, children }: { tree: TreeTopic[]; children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const [q, setQ] = useState("");

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    router.push(`/busca?q=${encodeURIComponent(q.trim())}`);
    setMenuOpen(false);
  }

  function linkProps(href: string) {
    return { "aria-current": pathname === href ? ("page" as const) : undefined };
  }

  return (
    <div className="app">
      <header className="site-header">
        <button
          type="button"
          className="btn icon menu-btn"
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3 6h18M3 12h18M3 18h18" />
          </svg>
        </button>

        <Link href="/" className="brand">
          <span className="mark">
            Wiki<em>Pig</em>
          </span>
          <span className="tag-beta">vet</span>
        </Link>

        <form className="header-search" onSubmit={submitSearch} role="search">
          <div className="search-wrap">
            <svg className="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            <input
              type="search"
              className="search-box"
              placeholder="Buscar em todo o conteúdo…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Buscar"
            />
          </div>
        </form>

        <div className="header-actions">
          <ThemeToggle />
          <Link href="/admin" className="btn">
            Entrar
          </Link>
        </div>
      </header>

      <div className="layout">
        <aside className={`sidebar${menuOpen ? " open" : ""}`}>
          <nav aria-label="Tópicos">
            {tree.map((root) => (
              <div className="nav-section" key={root.slug}>
                <p className="nav-label">{root.name}</p>
                <ul className="nav-tree">
                  {root.children.length === 0 && (
                    <li>
                      <Link href={`/topico/${root.slug}`} {...linkProps(`/topico/${root.slug}`)} onClick={() => setMenuOpen(false)}>
                        Visão geral
                      </Link>
                    </li>
                  )}
                  {root.children.map((child) => (
                    <li key={child.slug}>
                      <Link
                        href={`/topico/${child.slug}`}
                        {...linkProps(`/topico/${child.slug}`)}
                        onClick={() => setMenuOpen(false)}
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {tree.length === 0 && <p className="nav-label">Sem tópicos ainda.</p>}
          </nav>
        </aside>

        <main className="site-main">
          <div className="shell">{children}</div>
        </main>
      </div>
    </div>
  );
}
