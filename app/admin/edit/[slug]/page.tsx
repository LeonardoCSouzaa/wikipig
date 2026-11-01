import { redirect, notFound } from "next/navigation";
import type { Metadata } from "next";
import { isAuthenticated } from "@/lib/auth";
import { getPage, getTopics } from "@/lib/content";
import { PageEditor } from "@/components/admin/PageEditor";

export const metadata: Metadata = { title: "Editar página", robots: { index: false } };

export default async function EditPage({ params }: PageProps<"/admin/edit/[slug]">) {
  if (!(await isAuthenticated())) redirect("/admin");
  const { slug } = await params;
  const [page, topics] = await Promise.all([getPage(slug), getTopics()]);
  if (!page) notFound();
  return <PageEditor initial={page} topics={topics} />;
}
