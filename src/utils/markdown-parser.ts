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

function extractSection(content: string, heading: string): string {
  const regex = new RegExp(
    `^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$)`,
    "m"
  );
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

function extractSectionBilingual(content: string, en: string, pt: string): string {
  return extractSection(content, en) || extractSection(content, pt);
}

function extractOneLiner(content: string): string {
  const match = content.match(
    />\s*\*\*(?:Resumo em uma frase|One-sentence summary):\*\*\s*(.*?)(?:\n|$)/
  );
  return match ? match[1].trim() : "";
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
      ideas: extractSectionBilingual(content, "Key Ideas", "Principais Ideias"),
      frameworks: extractSectionBilingual(content, "Frameworks and Models", "Frameworks e Modelos"),
      quotes: extractSectionBilingual(content, "Key Quotes", "Citações-Chave"),
      connections: extractSectionBilingual(content, "Connections with Other Books", "Conexões com Outros Livros"),
      whenToUse: extractSectionBilingual(content, "When to Use This Knowledge", "Quando Usar Este Conhecimento"),
    },
  };
}
