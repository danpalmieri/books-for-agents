#!/usr/bin/env node

/**
 * Reads all .md book files and generates a JSON bundle for the CF Worker.
 * Run with: npx tsx scripts/build-books-data.ts
 */

import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import { join, basename, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const booksDir = join(__dirname, "..", "books");
const outDir = join(__dirname, "..", "generated");
const outFile = join(outDir, "books-data.json");

interface BookMetadata {
  title: string;
  author: string;
  year: number;
  category: string;
  tags: string[];
  language: string;
  isbn: string;
  slug: string;
}

interface Book {
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
  const fm: Record<string, unknown> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let value: unknown = line.slice(idx + 1).trim();
    if (typeof value === "string" && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (typeof value === "string" && value.startsWith("[")) {
      try { value = JSON.parse(value.replace(/'/g, '"')); } catch { /* keep */ }
    }
    if (typeof value === "string" && /^\d+$/.test(value)) {
      value = parseInt(value, 10);
    }
    fm[key] = value;
  }
  return fm;
}

function extractSection(content: string, heading: string): string {
  const regex = new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$)`, "m");
  const match = content.match(regex);
  return match ? match[1].trim() : "";
}

function extractOneLiner(content: string): string {
  const match = content.match(/>\s*\*\*Resumo em uma frase:\*\*\s*(.*?)(?:\n|$)/);
  return match ? match[1].trim() : "";
}

function parseBook(filePath: string): Book {
  const raw = readFileSync(filePath, "utf-8");
  const fm = parseFrontmatter(raw);
  const content = raw.replace(/^---\n[\s\S]*?\n---\n*/, "").trim();
  const slug = basename(filePath, ".md");

  return {
    metadata: {
      title: (fm.title as string) || "",
      author: (fm.author as string) || "",
      year: (fm.year as number) || 0,
      category: (fm.category as string) || "",
      tags: (fm.tags as string[]) || [],
      language: (fm.language as string) || "pt-BR",
      isbn: (fm.isbn as string) || "",
      slug,
    },
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

// --- Main ---

mkdirSync(outDir, { recursive: true });

const books: Book[] = [];
const categories = readdirSync(booksDir).filter((e) => {
  const p = join(booksDir, e);
  return statSync(p).isDirectory() && !e.startsWith("_");
});

for (const cat of categories) {
  const catPath = join(booksDir, cat);
  const files = readdirSync(catPath).filter((f) => f.endsWith(".md") && !f.startsWith("_"));
  for (const file of files) {
    books.push(parseBook(join(catPath, file)));
  }
}

writeFileSync(outFile, JSON.stringify(books, null, 2));
console.log(`Generated ${outFile} (${books.length} books, ${(statSync(outFile).size / 1024).toFixed(0)}KB)`);
