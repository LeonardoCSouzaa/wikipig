import "server-only";
import { promises as fs } from "fs";
import path from "path";

/**
 * Persistência do conteúdo.
 * - Dev / servidor com disco gravável: escreve direto no filesystem.
 * - Produção (Vercel, FS read-only): commita via GitHub API, e o push dispara redeploy.
 * Seleção: se GITHUB_TOKEN estiver definido, usa GitHub; senão, filesystem.
 */

function useGitHub(): boolean {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
}

const ROOT = process.cwd();

// ---------- Filesystem ----------
async function fsWrite(relPath: string, content: string) {
  const full = path.join(ROOT, relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf8");
}

async function fsDelete(relPath: string) {
  const full = path.join(ROOT, relPath);
  await fs.rm(full, { force: true });
}

// ---------- GitHub Contents API ----------
function ghConfig() {
  const [owner, repo] = (process.env.GITHUB_REPO ?? "").split("/");
  return {
    owner,
    repo,
    branch: process.env.GITHUB_BRANCH ?? "main",
    token: process.env.GITHUB_TOKEN!,
  };
}

async function ghGetSha(relPath: string): Promise<string | undefined> {
  const { owner, repo, branch, token } = ghConfig();
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(relPath)}?ref=${branch}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    cache: "no-store",
  });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`GitHub GET ${relPath}: ${res.status}`);
  const data = (await res.json()) as { sha: string };
  return data.sha;
}

async function ghWrite(relPath: string, content: string, message: string) {
  const { owner, repo, branch, token } = ghConfig();
  const sha = await ghGetSha(relPath);
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(relPath)}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify({
      message,
      content: Buffer.from(content, "utf8").toString("base64"),
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) throw new Error(`GitHub PUT ${relPath}: ${res.status} ${await res.text()}`);
}

async function ghDelete(relPath: string, message: string) {
  const { owner, repo, branch, token } = ghConfig();
  const sha = await ghGetSha(relPath);
  if (!sha) return;
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(relPath)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify({ message, sha, branch }),
  });
  if (!res.ok) throw new Error(`GitHub DELETE ${relPath}: ${res.status} ${await res.text()}`);
}

// ---------- API pública ----------
export const STORAGE_MODE = () => (useGitHub() ? "github" : "filesystem");

export async function writeContent(relPath: string, content: string, message: string) {
  if (useGitHub()) await ghWrite(relPath, content, message);
  else await fsWrite(relPath, content);
}

export async function deleteContent(relPath: string, message: string) {
  if (useGitHub()) await ghDelete(relPath, message);
  else await fsDelete(relPath);
}
