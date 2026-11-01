"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Excluir a página "${slug}"? Esta ação não pode ser desfeita.`)) return;
    setBusy(true);
    const res = await fetch(`/api/pages/${slug}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else alert("Falha ao excluir.");
  }

  return (
    <button type="button" className="btn" onClick={remove} disabled={busy}>
      {busy ? "Excluindo…" : "Excluir"}
    </button>
  );
}
