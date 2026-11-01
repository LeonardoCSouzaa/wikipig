import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { writeContent, deleteContent } from "@/lib/store";
import type { Page } from "@/lib/types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function POST(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { page?: Page; oldSlug?: string } | null;
  const page = body?.page;
  if (!page || !page.slug || !SLUG_RE.test(page.slug)) {
    return NextResponse.json({ error: "Slug inválido (use minúsculas, números e hífens)." }, { status: 400 });
  }
  if (!page.title?.trim()) {
    return NextResponse.json({ error: "Título obrigatório." }, { status: 400 });
  }
  if (page.type !== "matrix" && page.type !== "article") {
    return NextResponse.json({ error: "Tipo inválido." }, { status: 400 });
  }

  page.updatedAt = new Date().toISOString();
  const content = JSON.stringify(page, null, 2) + "\n";
  await writeContent(`content/pages/${page.slug}.json`, content, `conteúdo: salva ${page.slug}`);

  const old = body?.oldSlug;
  if (old && old !== page.slug && SLUG_RE.test(old)) {
    await deleteContent(`content/pages/${old}.json`, `conteúdo: remove ${old} (renomeada)`);
    revalidatePath(`/${old}`);
  }

  revalidatePath("/");
  revalidatePath("/busca");
  revalidatePath(`/${page.slug}`);
  revalidatePath(`/topico/${page.topic}`);
  return NextResponse.json({ ok: true, slug: page.slug });
}
