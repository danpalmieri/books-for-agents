import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const booksDir = join(__dirname, "..", "..", "books");

export interface BookMeta {
  title: string;
  author: string;
  year: number;
  category: string;
  tags: string[];
  isbn: string;
}

export interface PromptResult {
  system: string;
  user: string;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
}

export function buildPrompt(
  bookMeta: BookMeta,
  existingSlugs: string[]
): PromptResult {
  const template = readFileSync(join(booksDir, "_template.md"), "utf-8");
  const example = readFileSync(
    join(booksDir, "psychology", "atomic-habits.md"),
    "utf-8"
  );

  const system = `You are an expert book analyst creating structured summaries for a knowledge base consumed by AI agents.

Your output must follow the template below EXACTLY. The summary will be validated by an automated script, so adherence to the structure is critical.

## Quality requirements

- The summary must have at least 150-200 non-empty lines of content (excluding frontmatter)
- Include 5-7 Key Ideas, each with 2-3 substantive paragraphs and a **Practical application:** section
- Frameworks and Models section should have 2-4 named frameworks with structured descriptions
- Include 3-5 Key Quotes (use real, well-known quotes from the book)
- Connections should reference existing books using [[slug]] format — only use slugs from the provided list
- When to Use This Knowledge should list 5-8 specific scenarios
- Write in English
- Focus on structured insights, original analysis, frameworks, and practical applications
- Do NOT reproduce large chunks of the book's text — extract and synthesize the ideas

## Template

${template}

## Reference example

Below is a complete example of a high-quality summary that passes all validations. Use this as your quality and structure reference:

${example}`;

  const slugList = existingSlugs.map((s) => `  - [[${s}]]`).join("\n");

  const user = `Generate a complete book summary for:

- **Title:** ${bookMeta.title}
- **Author:** ${bookMeta.author}
- **Year:** ${bookMeta.year}
- **Category:** ${bookMeta.category}
- **Tags:** ${JSON.stringify(bookMeta.tags)}
- **ISBN:** ${bookMeta.isbn}
- **Language:** en

## Existing books in the repository (use these for Connections)

${slugList}

## Instructions

Output the complete markdown file starting with the \`---\` frontmatter block. Do NOT wrap the output in markdown code fences. Output raw markdown only, starting with \`---\` on the very first line.`;

  // Rough token estimation: ~4 chars per token
  const systemTokens = Math.ceil(system.length / 4);
  const userTokens = Math.ceil(user.length / 4);
  const estimatedInputTokens = systemTokens + userTokens;
  const estimatedOutputTokens = 6000;

  return {
    system,
    user,
    estimatedInputTokens,
    estimatedOutputTokens,
  };
}
