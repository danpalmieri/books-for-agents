import type { Book, BookMetadata } from "../types.js";

function parseFrontmatter(raw: string): Record<string, unknown> {
  const match = raw.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const frontmatter: Record<string, unknown> = {};
  const lines = match[1].split("\n");

  for (const line of lines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) continue;

    const key = line.slice(0, colonIdx).trim();
    let value: unknown = line.slice(colonIdx + 1).trim();

    // Remove quotes
    if (
      typeof value === "string" &&
      value.startsWith('"') &&
      value.endsWith('"')
    ) {
      value = value.slice(1, -1);
    }

    // Parse arrays
    if (typeof value === "string" && value.startsWith("[")) {
      try {
        value = JSON.parse(value.replace(/'/g, '"'));
      } catch {
        // keep as string
      }
    }

    // Parse numbers
    if (typeof value === "string" && /^\d+$/.test(value)) {
      value = parseInt(value, 10);
    }

    frontmatter[key] = value;
  }

  return frontmatter;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Accepted `## ` headings per section, canonical first. Summaries in the
 * knowledge base predate the current template and use several spellings
 * (`Connections` vs `Connections with Other Books`, `Key Frameworks` vs
 * `Frameworks and Models`), plus the Portuguese variants.
 */
export const SECTION_HEADINGS = {
  ideas: ["Key Ideas", "Core Ideas", "Principais Ideias"],
  frameworks: [
    "Frameworks and Models",
    "Key Frameworks",
    "Frameworks",
    "Frameworks e Modelos",
  ],
  quotes: ["Key Quotes", "Quotes", "Citações-Chave"],
  connections: [
    "Connections with Other Books",
    "Connections",
    "Conexões com Outros Livros",
  ],
  whenToUse: [
    "When to Use This Knowledge",
    "When to Use This Book",
    "When to Read This Book",
    "When to Use",
    "Quando Usar Este Conhecimento",
  ],
} as const;

const ONE_LINER_HEADINGS = [
  "One-sentence summary",
  "One-Sentence Summary",
  "One-line summary",
  "Resumo em uma frase",
];

function extractSection(content: string, heading: string): string {
  // Find the `## <heading>` line, then take everything up to the next `## `
  // line. Anchoring the end with `$` would stop at the first line break under
  // the `m` flag, which truncated every section to a single line.
  const start = new RegExp(`^##[ \\t]+${escapeRegExp(heading)}[ \\t]*$`, "m").exec(content);
  if (!start) return "";

  const rest = content.slice(start.index + start[0].length);
  const next = /^## /m.exec(rest);
  return (next ? rest.slice(0, next.index) : rest).trim();
}

function extractAnySection(content: string, headings: readonly string[]): string {
  for (const heading of headings) {
    const section = extractSection(content, heading);
    if (section) return section;
  }
  return "";
}

function extractOneLiner(content: string): string {
  const match = content.match(
    />\s*\*\*(?:Resumo em uma frase|One-sentence summary):\*\*\s*(.*?)(?:\n|$)/i
  );
  if (match) return match[1].trim();

  // Older summaries put it in a dedicated section instead of a blockquote.
  const section = extractAnySection(content, ONE_LINER_HEADINGS);
  return section.split("\n")[0].trim();
}

export function parseBookFromContent(raw: string, slug: string): Book {
  const fm = parseFrontmatter(raw);

  // Remove frontmatter from content
  const content = raw.replace(/^---\n[\s\S]*?\n---\n*/, "").trim();

  const metadata: BookMetadata = {
    title: (fm.title as string) || "",
    author: (fm.author as string) || "",
    year: (fm.year as number) || 0,
    category: (fm.category as string) || "",
    tags: (fm.tags as string[]) || [],
    language: (fm.language as string) || "en",
    isbn: (fm.isbn as string) || "",
    slug,
  };

  return {
    metadata,
    content,
    oneLiner: extractOneLiner(content),
    sections: {
      ideas: extractAnySection(content, SECTION_HEADINGS.ideas),
      frameworks: extractAnySection(content, SECTION_HEADINGS.frameworks),
      quotes: extractAnySection(content, SECTION_HEADINGS.quotes),
      connections: extractAnySection(content, SECTION_HEADINGS.connections),
      whenToUse: extractAnySection(content, SECTION_HEADINGS.whenToUse),
    },
  };
}
