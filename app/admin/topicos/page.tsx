import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { isAuthenticated } from "@/lib/auth";
import { getTopics } from "@/lib/content";
import { TopicEditor } from "@/components/admin/TopicEditor";

export const metadata: Metadata = { title: "Tópicos", robots: { index: false } };

export default async function TopicosPage() {
  if (!(await isAuthenticated())) redirect("/admin");
  const topics = await getTopics();
  return <TopicEditor initial={topics} />;
}
