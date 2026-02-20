#!/usr/bin/env bun

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const booksDir = join(import.meta.dir, "..", "books");

const REQUIRED_FRONTMATTER = ["title", "author", "year", "category", "tags", "language"];
// Each entry: [English, Portuguese] — accept either language
const REQUIRED_SECTIONS: [string, string][] = [
  ["Key Ideas", "Principais Ideias"],
  ["Frameworks and Models", "Frameworks e Modelos"],
  ["Key Quotes", "Citações-Chave"],
  ["Connections with Other Books", "Conexões com Outros Livros"],
  ["When to Use This Knowledge", "Quando Usar Este Conhecimento"],
];
const VALID_CATEGORIES = ["business", "psychology", "technology", "self-improvement"];

interface ValidationError {
  file: string;
  errors: string[];
}

function parseFrontmatter(content: string): Record<string, string> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;

  const fm: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return fm;
}

function validateBook(filePath: string): string[] {
  const errors: string[] = [];
  const content = readFileSync(filePath, "utf-8");

  // Check frontmatter exists
  const fm = parseFrontmatter(content);
  if (!fm) {
    errors.push("Missing frontmatter (---) block");
    return errors;
  }

  // Check required frontmatter fields
  for (const field of REQUIRED_FRONTMATTER) {
    if (!fm[field]) {
      errors.push(`Missing frontmatter field: ${field}`);
    }
  }

  // Check category is valid
  if (fm.category) {
    const cat = fm.category.replace(/"/g, "");
    if (!VALID_CATEGORIES.includes(cat)) {
      errors.push(`Invalid category "${cat}". Valid: ${VALID_CATEGORIES.join(", ")}`);
    }
  }

  // Check one-liner exists (either language)
  if (!content.includes("**Resumo em uma frase:**") && !content.includes("**One-sentence summary:**")) {
    errors.push('Missing one-liner ("**One-sentence summary:**" or "**Resumo em uma frase:**")');
  }

  // Check required sections (accept either language)
  for (const [en, pt] of REQUIRED_SECTIONS) {
    if (!content.includes(`## ${en}`) && !content.includes(`## ${pt}`)) {
      errors.push(`Missing section: ## ${en} (or ## ${pt})`);
    }
  }

  // Check minimum content length (excluding frontmatter)
  const body = content.replace(/^---\n[\s\S]*?\n---\n*/, "");
  const lines = body.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 50) {
    errors.push(`Content too short: ${lines.length} non-empty lines (minimum: 50)`);
  }

  // Check for at least one practical application (either language)
  if (!content.includes("**Aplicação prática:**") && !content.includes("**Practical application:**")) {
    errors.push('Missing "**Practical application:**" (or "**Aplicação prática:**") in at least one idea');
  }

  return errors;
}

function main() {
  console.log("📚 Validating books...\n");

  const results: ValidationError[] = [];
  let totalBooks = 0;

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
      totalBooks++;
      const filePath = join(categoryPath, file);
      const relPath = relative(booksDir, filePath);
      const errors = validateBook(filePath);

      if (errors.length > 0) {
        results.push({ file: relPath, errors });
      } else {
        console.log(`  ✅ ${relPath}`);
      }
    }
  }

  if (results.length > 0) {
    console.log("");
    for (const { file, errors } of results) {
      console.log(`  ❌ ${file}`);
      for (const err of errors) {
        console.log(`     - ${err}`);
      }
    }
  }

  console.log(`\n📊 Results: ${totalBooks - results.length}/${totalBooks} books valid`);

  if (results.length > 0) {
    process.exit(1);
  }
}

main();
