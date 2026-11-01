import { getTopicTree } from "@/lib/content";
import { AppChrome } from "./AppChrome";

export async function SiteShell({ children }: { children: React.ReactNode }) {
  const tree = await getTopicTree();
  return <AppChrome tree={tree}>{children}</AppChrome>;
}
