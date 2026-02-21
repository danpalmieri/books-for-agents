#!/usr/bin/env npx tsx

import { readFileSync, writeFileSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const backlogPath = join(rootDir, "books", "backlog.yml");

const VALID_CATEGORIES = [
  "business",
  "psychology",
  "technology",
  "self-improvement",
];

function parseSuggestionBody(body: string) {
  const titleMatch = body.match(/\*\*Title:\*\*\s*(.+)/);
  const authorMatch = body.match(/\*\*Author:\*\*\s*(.+)/);
  const categoryMatch = body.match(/\*\*Category:\*\*\s*(.+)/);
  const yearMatch = body.match(/\*\*Year:\*\*\s*(.+)/);
  const isbnMatch = body.match(/\*\*ISBN:\*\*\s*(.+)/);
  const tagsMatch = body.match(/\*\*Tags:\*\*\s*(.+)/);

  if (!titleMatch || !authorMatch || !categoryMatch) {
    console.error("Failed to parse suggestion body metadata.");
    console.error("Title:", titleMatch?.[1] ?? "NOT FOUND");
    console.error("Author:", authorMatch?.[1] ?? "NOT FOUND");
    console.error("Category:", categoryMatch?.[1] ?? "NOT FOUND");
    process.exit(1);
  }

  const title = titleMatch[1].trim();
  const author = authorMatch[1].trim();
  const category = categoryMatch[1].trim();
  const year = yearMatch?.[1]?.trim() ?? "FILL_IN";
  const isbn = isbnMatch?.[1]?.trim() ?? "FILL_IN";
  const tags = tagsMatch?.[1]?.trim() ?? "FILL_IN";

  // Extract YAML block anchored on the footer sentinel
  const yamlMatch = body.match(
    /```yaml\n([\s\S]+?)\n```\s*\n---\s*\n\*This suggestion/
  );
  if (!yamlMatch) {
    console.error("Failed to extract YAML block from suggestion body.");
    process.exit(1);
  }

  const yamlBlock = yamlMatch[1];

  return { title, author, category, year, isbn, tags, yamlBlock };
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/['':]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function validate(category: string, title: string) {
  if (category.includes("..") || title.includes("..")) {
    console.error("Path traversal detected.");
    process.exit(1);
  }

  if (!VALID_CATEGORIES.includes(category)) {
    console.error(
      `Invalid category: "${category}". Valid: ${VALID_CATEGORIES.join(", ")}`
    );
    process.exit(1);
  }
}

function appendToBacklog(yamlBlock: string, title: string) {
  const existing = readFileSync(backlogPath, "utf-8");

  // Check for duplicate title
  const titleLower = title.toLowerCase();
  const existingTitles = existing.match(/title:\s*"([^"]+)"/g) || [];
  for (const match of existingTitles) {
    const existingTitle = match.replace(/title:\s*"/, "").replace(/"$/, "");
    if (existingTitle.toLowerCase() === titleLower) {
      console.error(`Duplicate: "${title}" already exists in backlog.yml`);
      process.exit(1);
    }
  }

  // Ensure the YAML block is indented correctly (2 spaces for list items under books:)
  const indentedBlock = yamlBlock
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");

  // Append with a blank line separator
  const content = existing.trimEnd() + "\n\n" + indentedBlock + "\n";
  writeFileSync(backlogPath, content, "utf-8");
  console.log(`Appended to: ${backlogPath}`);
}

function main() {
  const body = process.env.ISSUE_BODY;
  if (!body) {
    console.error("ISSUE_BODY environment variable is required.");
    process.exit(1);
  }

  const { title, author, category, yamlBlock } = parseSuggestionBody(body);
  validate(category, title);

  const slug = generateSlug(title);

  console.log(`Title:    ${title}`);
  console.log(`Author:   ${author}`);
  console.log(`Category: ${category}`);
  console.log(`Slug:     ${slug}`);

  if (process.argv.includes("--write")) {
    appendToBacklog(yamlBlock, title);
  }

  // Write outputs for GitHub Actions
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `title=${title}\n`);
    appendFileSync(outputFile, `author=${author}\n`);
    appendFileSync(outputFile, `category=${category}\n`);
    appendFileSync(outputFile, `slug=${slug}\n`);
  }
}

main();
