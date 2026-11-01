import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isAuthenticated } from "@/lib/auth";
import { getTopics } from "@/lib/content";
import { PageEditor } from "@/components/admin/PageEditor";

export const metadata: Metadata = { title: "Nova página", robots: { index: false } };

export default async function NewPage() {
  if (!(await isAuthenticated())) redirect("/admin");
  const topics = await getTopics();
  return <PageEditor initial={null} topics={topics} />;
}
