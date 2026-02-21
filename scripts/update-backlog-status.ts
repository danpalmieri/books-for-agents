#!/usr/bin/env npx tsx

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const backlogPath = join(rootDir, "books", "backlog.yml");

interface BacklogEntry {
  title: string;
  author: string;
  year: number;
  category: string;
  tags: string[];
  isbn: string;
  status: "pending" | "in-progress" | "done" | "skipped";
  contributor: string | null;
}

interface Backlog {
  books: BacklogEntry[];
}

function loadBacklog(): Backlog {
  const raw = readFileSync(backlogPath, "utf-8");
  return parseYaml(raw) as Backlog;
}

function saveBacklog(backlog: Backlog): void {
  writeFileSync(backlogPath, stringifyYaml(backlog, { lineWidth: 0 }));
}

function main() {
  const prTitle = process.env.PR_TITLE;
  if (!prTitle) {
    console.error("PR_TITLE environment variable is required.");
    process.exit(1);
  }

  const match = prTitle.match(/^Add:\s*(.+?)\s*[—–-]{1,3}\s*.+$/);
  if (!match) {
    console.error(`PR title does not match expected format: "${prTitle}"`);
    console.error('Expected: "Add: {Title} — {Author}"');
    process.exit(1);
  }

  const bookTitle = match[1].trim();
  console.log(`Looking for book: "${bookTitle}"`);

  const backlog = loadBacklog();
  const entry = backlog.books.find(
    (b) => b.title.toLowerCase() === bookTitle.toLowerCase()
  );

  if (!entry) {
    console.error(`Book "${bookTitle}" not found in backlog.`);
    process.exit(1);
  }

  if (entry.status === "done") {
    console.log(`Book "${bookTitle}" is already marked as done.`);
    process.exit(0);
  }

  entry.status = "done";
  entry.contributor = "github-actions[bot]";
  saveBacklog(backlog);

  console.log(`Updated "${bookTitle}" to status: done`);
}

main();
