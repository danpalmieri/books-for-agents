import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, basename, relative } from "node:path";

export interface BookMetadata {
  title: string;
  author: string;
  year: number;
  category: string;
  tags: string[];
  language: string;
  isbn: string;
  slug: string;
}

export interface Book {
  metadata: BookMetadata;
  content: string;
  oneLiner: string;
  sections: {
    ideas: string;
    frameworks: string;
    quotes: string;
    connections: string;
    whenToUse: string;
  };
}

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

function extractOneLiner(content: string): string {
  const match = content.match(
    />\s*\*\*Resumo em uma frase:\*\*\s*(.*?)(?:\n|$)/
  );
  return match ? match[1].trim() : "";
}

export function parseBook(filePath: string): Book {
  const raw = readFileSync(filePath, "utf-8");
  const fm = parseFrontmatter(raw);

  // Remove frontmatter from content
  const content = raw.replace(/^---\n[\s\S]*?\n---\n*/, "").trim();
  const slug = basename(filePath, ".md");

  const metadata: BookMetadata = {
    title: (fm.title as string) || "",
    author: (fm.author as string) || "",
    year: (fm.year as number) || 0,
    category: (fm.category as string) || "",
    tags: (fm.tags as string[]) || [],
    language: (fm.language as string) || "pt-BR",
    isbn: (fm.isbn as string) || "",
    slug,
  };

  return {
    metadata,
    content,
    oneLiner: extractOneLiner(content),
    sections: {
      ideas: extractSection(content, "Principais Ideias"),
      frameworks: extractSection(content, "Frameworks e Modelos"),
      quotes: extractSection(content, "Citações-Chave"),
      connections: extractSection(content, "Conexões com Outros Livros"),
      whenToUse: extractSection(content, "Quando Usar Este Conhecimento"),
    },
  };
}

export function loadAllBooks(booksDir: string): Book[] {
  const books: Book[] = [];

  const categories = readdirSync(booksDir).filter((entry) => {
    const fullPath = join(booksDir, entry);
    return statSync(fullPath).isDirectory() && !entry.startsWith("_");
  });

  for (const category of categories) {
    const categoryPath = join(booksDir, category);
    const files = readdirSync(categoryPath).filter(
      (f) => f.endsWith(".md") && !f.startsWith("_")
    );

    for (const file of files) {
      try {
        const book = parseBook(join(categoryPath, file));
        books.push(book);
      } catch (err) {
        console.error(
          `Error parsing ${relative(booksDir, join(categoryPath, file))}:`,
          err
        );
      }
    }
  }

  return books;
}
