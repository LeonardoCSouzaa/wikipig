# WikiPig

Base de consulta de medicina veterinária de suínos — diagnóstico diferencial por sistema, com busca global e navegação por tópicos. Conteúdo editável por um admin autenticado, sem banco de dados.

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind 4**
- Conteúdo em arquivos **JSON** em `content/` (sem banco)
- Autenticação de admin por senha (sessão assinada com **jose**)
- Persistência da edição: **disco local** em dev; **commit via GitHub API** em produção
- Deploy em **Vercel**

## Rodar local

```bash
npm install
npm run dev
```

Abre em http://localhost:3000. Edição em `/admin` (senha padrão de dev: `admin`).

Crie um `.env.local` a partir de `.env.example` para definir senha/segredo.

## Modelo de conteúdo

- `content/topics.json` — árvore de tópicos (navegação).
- `content/pages/<slug>.json` — uma página. Dois tipos:
  - `matrix` — matriz comparativa de agentes (colunas) × características (linhas), com blocos, discriminadores, seções extras e fotos.
  - `article` — texto livre em Markdown.

Tipos em `lib/types.ts`. Leitura em `lib/content.ts`. Gravação em `lib/store.ts`.

## Edição (admin)

`/admin` → login por senha. Depois:
- **Nova página / Editar** — editor estruturado (matriz ou artigo).
- **Tópicos** — gerencia a árvore de navegação.
- **Excluir** — remove uma página.

Em produção, cada salvar/excluir faz um commit no repositório; o push dispara o redeploy do Vercel.

## Deploy no Vercel

1. Importe o repo `LeonardoCSouzaa/wikipig` no Vercel (framework Next.js, detectado).
2. Defina as variáveis de ambiente (Settings → Environment Variables):
   - `ADMIN_PASSWORD` — senha do admin.
   - `SESSION_SECRET` — string aleatória longa.
   - `GITHUB_TOKEN` — fine-grained PAT com *Contents: Read and write* neste repo.
   - `GITHUB_REPO` — `LeonardoCSouzaa/wikipig`.
   - `GITHUB_BRANCH` — `main`.
3. Deploy. A consulta é pública; a edição exige a senha.

Sem `GITHUB_TOKEN`, a edição em produção falha (FS read-only) — por isso o token é obrigatório lá.
