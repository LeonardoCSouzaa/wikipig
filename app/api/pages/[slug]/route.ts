import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { deleteContent } from "@/lib/store";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function DELETE(_req: Request, { params }: RouteContext<"/api/pages/[slug]">) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { slug } = await params;
  if (!SLUG_RE.test(slug)) {
    return NextResponse.json({ error: "Slug inválido." }, { status: 400 });
  }
  await deleteContent(`content/pages/${slug}.json`, `conteúdo: remove ${slug}`);
  revalidatePath("/");
  revalidatePath("/busca");
  revalidatePath(`/${slug}`);
  return NextResponse.json({ ok: true });
}
