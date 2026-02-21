#!/usr/bin/env npx tsx

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { execSync } from "node:child_process";
import { createInterface } from "node:readline";
import Anthropic from "@anthropic-ai/sdk";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { buildPrompt } from "./prompts/generate-summary.js";
import { validateBook } from "./validate-books.js";
import { loadAllBooks } from "../src/utils/markdown-parser.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const booksDir = join(rootDir, "books");
const backlogPath = join(booksDir, "backlog.yml");

// --- Types ---

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

// --- Helpers ---

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['':]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function loadBacklog(): Backlog {
  const raw = readFileSync(backlogPath, "utf-8");
  return parseYaml(raw) as Backlog;
}

function saveBacklog(backlog: Backlog): void {
  writeFileSync(backlogPath, stringifyYaml(backlog, { lineWidth: 0 }));
}

function getGitUser(): string {
  try {
    return execSync("git config user.name", { encoding: "utf-8" }).trim();
  } catch {
    return "anonymous";
  }
}

async function confirm(message: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${message} [y/N] `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === "y" || answer.toLowerCase() === "yes");
    });
  });
}

function estimateCost(
  inputTokens: number,
  outputTokens: number,
  model: string
): { input: number; output: number; total: number } {
  // Pricing per million tokens (as of 2025)
  const pricing: Record<string, { input: number; output: number }> = {
    "claude-sonnet-4-6": { input: 3, output: 15 },
    "claude-opus-4-6": { input: 15, output: 75 },
    "claude-haiku-4-5-20251001": { input: 0.8, output: 4 },
  };
  const p = pricing[model] ?? pricing["claude-sonnet-4-6"];
  const input = (inputTokens / 1_000_000) * p.input;
  const output = (outputTokens / 1_000_000) * p.output;
  return { input, output, total: input + output };
}

function stripCodeFences(text: string): string {
  // Remove leading ```markdown or ``` and trailing ```
  return text
    .replace(/^```(?:markdown|md)?\s*\n/, "")
    .replace(/\n```\s*$/, "");
}

// --- Main ---

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      pick: { type: "boolean", default: false },
      model: { type: "string", default: "claude-sonnet-4-6" },
      "dry-run": { type: "boolean", default: false },
      yes: { type: "boolean", short: "y", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help) {
    console.log(`
Usage: npm run generate -- [options] [title]

Options:
  --pick        Pick the next pending book from the backlog
  --model       Claude model to use (default: claude-sonnet-4-6)
  --dry-run     Show prompt and cost estimate without calling the API
  --yes, -y     Skip confirmation prompt
  --help, -h    Show this help message

Examples:
  npm run generate -- "The Power of Habit"
  npm run generate -- --pick
  npm run generate -- --pick --model claude-opus-4-6
  npm run generate -- --pick --dry-run
`);
    process.exit(0);
  }

  // 1. Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !values["dry-run"]) {
    console.error(
      "Error: ANTHROPIC_API_KEY environment variable is required.\n" +
        "Set it with: export ANTHROPIC_API_KEY=sk-ant-..."
    );
    process.exit(1);
  }

  // 2. Load backlog
  const backlog = loadBacklog();

  // 3. Resolve which book to generate
  let entry: BacklogEntry | undefined;

  if (values.pick) {
    entry = backlog.books.find((b) => b.status === "pending");
    if (!entry) {
      console.log("No pending books in the backlog. All done!");
      process.exit(0);
    }
  } else if (positionals.length > 0) {
    const title = positionals.join(" ");
    entry = backlog.books.find(
      (b) =>
        b.title.toLowerCase() === title.toLowerCase() && b.status === "pending"
    );
    if (!entry) {
      console.error(
        `Error: "${title}" not found in backlog or not in pending status.\n` +
          "Available pending books:"
      );
      for (const b of backlog.books.filter((b) => b.status === "pending")) {
        console.error(`  - ${b.title}`);
      }
      process.exit(1);
    }
  } else {
    console.error("Error: Provide a book title or use --pick.\n" +
      "Run with --help for usage.");
    process.exit(1);
  }

  const slug = slugify(entry.title);
  const outputPath = join(booksDir, entry.category, `${slug}.md`);

  if (existsSync(outputPath)) {
    console.error(
      `Error: ${outputPath} already exists. Remove it first or skip this book.`
    );
    process.exit(1);
  }

  // 4. Collect existing slugs
  const existingBooks = loadAllBooks(booksDir);
  const existingSlugs = existingBooks.map((b) => b.metadata.slug);

  // 5. Build prompt
  const prompt = buildPrompt(
    {
      title: entry.title,
      author: entry.author,
      year: entry.year,
      category: entry.category,
      tags: entry.tags,
      isbn: entry.isbn,
    },
    existingSlugs
  );

  const model = values.model!;
  const cost = estimateCost(
    prompt.estimatedInputTokens,
    prompt.estimatedOutputTokens,
    model
  );

  // 6. Show info
  console.log(`\n--- Book Generation ---`);
  console.log(`Title:    ${entry.title}`);
  console.log(`Author:   ${entry.author}`);
  console.log(`Category: ${entry.category}`);
  console.log(`Slug:     ${slug}`);
  console.log(`Output:   ${outputPath}`);
  console.log(`Model:    ${model}`);
  console.log(`\n--- Cost Estimate ---`);
  console.log(
    `Input:    ~${prompt.estimatedInputTokens.toLocaleString()} tokens ($${cost.input.toFixed(4)})`
  );
  console.log(
    `Output:   ~${prompt.estimatedOutputTokens.toLocaleString()} tokens ($${cost.output.toFixed(4)})`
  );
  console.log(`Total:    ~$${cost.total.toFixed(4)}`);
  console.log(`With retries (up to 3x): ~$${(cost.total * 3).toFixed(4)}\n`);

  if (values["dry-run"]) {
    console.log("--- System Prompt (first 500 chars) ---");
    console.log(prompt.system.slice(0, 500) + "...\n");
    console.log("--- User Prompt ---");
    console.log(prompt.user);
    process.exit(0);
  }

  // 7. Confirm
  if (!values.yes) {
    const ok = await confirm("Proceed with generation?");
    if (!ok) {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  // 8. Mark as in-progress
  entry.status = "in-progress";
  saveBacklog(backlog);

  const client = new Anthropic({ apiKey });
  const maxRetries = 2;
  let content = "";
  let messages: Anthropic.MessageParam[] = [
    { role: "user", content: prompt.user },
  ];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      console.log(`\nRetry ${attempt}/${maxRetries}...`);
    } else {
      console.log("Generating summary...");
    }

    const response = await client.messages.create({
      model,
      max_tokens: 8192,
      temperature: 0.7,
      system: prompt.system,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.error("Error: No text in API response.");
      process.exit(1);
    }

    content = stripCodeFences(textBlock.text);

    console.log(
      `  Tokens used — input: ${response.usage.input_tokens}, output: ${response.usage.output_tokens}`
    );

    // 9. Save and validate
    const categoryDir = join(booksDir, entry!.category);
    if (!existsSync(categoryDir)) {
      mkdirSync(categoryDir, { recursive: true });
    }
    writeFileSync(outputPath, content, "utf-8");

    const errors = validateBook(outputPath);
    if (errors.length === 0) {
      console.log("Validation passed!");
      break;
    }

    console.log(`Validation errors (attempt ${attempt + 1}):`);
    for (const err of errors) {
      console.log(`  - ${err}`);
    }

    if (attempt < maxRetries) {
      // Multi-turn: add assistant response and user correction
      messages.push({ role: "assistant", content: textBlock.text });
      messages.push({
        role: "user",
        content:
          `The generated summary has validation errors. Please fix them and output the COMPLETE corrected file (starting with \`---\`).\n\nErrors:\n` +
          errors.map((e) => `- ${e}`).join("\n"),
      });
    } else {
      console.log(
        "\nMax retries reached. The file was saved but has validation errors."
      );
      console.log("Please fix the issues manually before submitting a PR.");
    }
  }

  // 10. Update backlog
  entry!.status = "done";
  entry!.contributor = getGitUser();
  saveBacklog(backlog);

  console.log(`\nBook saved to: ${outputPath}`);
  console.log(`\n--- Next steps ---`);
  console.log(`1. Review the generated file: ${outputPath}`);
  console.log(`2. Make manual adjustments if needed`);
  console.log(`3. Run: npm run validate`);
  console.log(`4. Run: npm run build:data`);
  console.log(`5. Create a branch: git checkout -b add/${slug}`);
  console.log(`6. Commit and open a PR: Add: ${entry!.title} — ${entry!.author}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
