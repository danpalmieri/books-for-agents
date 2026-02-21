#!/usr/bin/env npx tsx

import { writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const booksDir = join(rootDir, "books");

const VALID_CATEGORIES = [
  "business",
  "psychology",
  "technology",
  "self-improvement",
];
const SLUG_PATTERN = /^[a-z0-9-]+$/;

function parseIssueBody(body: string) {
  const titleMatch = body.match(/\*\*Title:\*\*\s*(.+)/);
  const authorMatch = body.match(/\*\*Author:\*\*\s*(.+)/);
  const fileMatch = body.match(
    /\*\*File:\*\*\s*`books\/([^/]+)\/([^`]+)\.md`/
  );

  if (!titleMatch || !authorMatch || !fileMatch) {
    console.error("Failed to parse issue body metadata.");
    console.error("Title:", titleMatch?.[1] ?? "NOT FOUND");
    console.error("Author:", authorMatch?.[1] ?? "NOT FOUND");
    console.error(
      "File:",
      fileMatch ? `${fileMatch[1]}/${fileMatch[2]}.md` : "NOT FOUND"
    );
    process.exit(1);
  }

  const title = titleMatch[1].trim();
  const author = authorMatch[1].trim();
  const category = fileMatch[1].trim();
  const slug = fileMatch[2].trim();

  // Extract content anchored on the footer sentinel
  const contentMatch = body.match(
    /```markdown\n([\s\S]+?)\n```\s*\n---\s*\n\*This summary/
  );
  if (!contentMatch) {
    console.error("Failed to extract markdown content from issue body.");
    process.exit(1);
  }

  const content = contentMatch[1];

  return { title, author, category, slug, content };
}

function validate(category: string, slug: string) {
  if (category.includes("..") || slug.includes("..")) {
    console.error("Path traversal detected in category or slug.");
    process.exit(1);
  }

  if (!VALID_CATEGORIES.includes(category)) {
    console.error(
      `Invalid category: "${category}". Valid: ${VALID_CATEGORIES.join(", ")}`
    );
    process.exit(1);
  }

  if (!SLUG_PATTERN.test(slug)) {
    console.error(`Invalid slug: "${slug}". Must match [a-z0-9-]`);
    process.exit(1);
  }
}

function main() {
  const body = process.env.ISSUE_BODY;
  if (!body) {
    console.error("ISSUE_BODY environment variable is required.");
    process.exit(1);
  }

  const { title, author, category, slug, content } = parseIssueBody(body);
  validate(category, slug);

  console.log(`Title:    ${title}`);
  console.log(`Author:   ${author}`);
  console.log(`Category: ${category}`);
  console.log(`Slug:     ${slug}`);

  if (process.argv.includes("--write")) {
    const categoryDir = join(booksDir, category);
    if (!existsSync(categoryDir)) {
      mkdirSync(categoryDir, { recursive: true });
    }

    const outputPath = join(categoryDir, `${slug}.md`);
    writeFileSync(outputPath, content, "utf-8");
    console.log(`Written: ${outputPath}`);
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
