import { Suspense } from "react";
import type { Metadata } from "next";
import { getSearchIndex } from "@/lib/content";
import { SearchResults } from "@/components/SearchResults";

export const metadata: Metadata = { title: "Busca" };

export default async function BuscaPage() {
  const index = await getSearchIndex();
  return (
    <Suspense fallback={<p className="sub">Carregando busca…</p>}>
      <SearchResults index={index} />
    </Suspense>
  );
}
