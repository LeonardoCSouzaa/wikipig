// Modelo de conteúdo do WikiPig. Conteúdo vive em arquivos JSON em /content.

export type AgentColor = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

/** Coluna da matriz: um agente (doença/patógeno) comparado. */
export interface Agent {
  id: string;
  sci: string; // nome científico (itálico)
  common: string; // nome comum / síndrome
  color: AgentColor;
}

/** Célula de uma linha, por agente. `key` = discriminador decisivo. */
export interface MatrixCell {
  html: string;
  key?: boolean;
}

/** Bloco de linhas (ex.: Clínico, Necropsia, Laboratório). */
export interface Block {
  id: string;
  name: string;
}

/** Linha da matriz: uma característica comparada entre agentes. */
export interface MatrixRow {
  label: string;
  block?: string; // id de Block
  cells: Record<string, MatrixCell>; // chave = agent.id
}

/** Card da chave de decisão. */
export interface KeyCard {
  agent?: AgentColor;
  title: string;
  items: string[]; // HTML inline permitido
}

/** Callout (lista destacada), opcionalmente em tom de alerta. */
export interface Callout {
  alert?: boolean;
  title: string;
  items: string[];
}

/** Seção livre abaixo da matriz. */
export interface Section {
  type: "keygrid" | "callouts" | "html";
  title?: string;
  sub?: string;
  cards?: KeyCard[];
  callouts?: Callout[];
  html?: string;
}

/** Foto de um agente/achado, agrupada pelo id usado no botão "Ver fotos". */
export interface Photo {
  group: string; // ex.: agent.id ou chave livre ("padroes")
  src: string; // caminho em /public ou URL
  label?: string;
  caption?: string;
}

export type PageType = "matrix" | "article";

export interface Page {
  slug: string;
  topic: string; // slug de Topic
  type: PageType;
  title: string;
  eyebrow?: string;
  standfirst?: string;
  updatedAt?: string;

  // type === "matrix"
  agents?: Agent[];
  blocks?: Block[];
  rows?: MatrixRow[];
  sections?: Section[];
  photos?: Photo[];

  // type === "article"
  body?: string; // Markdown
}

export interface Topic {
  slug: string;
  name: string;
  parent?: string; // slug do tópico pai
  order?: number;
  description?: string;
}

/** Entrada do índice de busca (gerado do conteúdo). */
export interface SearchDoc {
  slug: string;
  title: string;
  topic: string;
  type: PageType;
  text: string; // texto plano concatenado para busca
}
