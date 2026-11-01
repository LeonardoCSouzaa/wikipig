import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { isAuthenticated } from "@/lib/auth";
import { writeContent } from "@/lib/store";
import type { Topic } from "@/lib/types";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function PUT(req: Request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const body = (await req.json().catch(() => null)) as { topics?: Topic[] } | null;
  const topics = body?.topics;
  if (!Array.isArray(topics)) {
    return NextResponse.json({ error: "Lista de tópicos inválida." }, { status: 400 });
  }
  for (const t of topics) {
    if (!t.slug || !SLUG_RE.test(t.slug) || !t.name?.trim()) {
      return NextResponse.json({ error: `Tópico inválido: ${t.slug ?? "?"}` }, { status: 400 });
    }
  }
  const content = JSON.stringify(topics, null, 2) + "\n";
  await writeContent("content/topics.json", content, "conteúdo: atualiza tópicos");
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
