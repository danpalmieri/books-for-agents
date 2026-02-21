#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadAllBooks } from "./utils/markdown-parser.js";
import { SearchEngine } from "./utils/search-engine.js";
import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import { searchBooks } from "./tools/search-books.js";
import { getBook, getBookSection } from "./tools/get-book.js";
import { listCategories } from "./tools/list-categories.js";
import { generateBook, listBacklog, type BacklogEntry } from "./tools/generate-book.js";
import { submitBook } from "./tools/submit-book.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const booksDir = join(__dirname, "..", "books");

// Load and index books
const books = loadAllBooks(booksDir);
const engine = new SearchEngine();
engine.index(books);

// Load generation data
const backlogRaw = readFileSync(join(booksDir, "backlog.yml"), "utf-8");
const backlog: BacklogEntry[] = parseYaml(backlogRaw).books;
const template = readFileSync(join(booksDir, "_template.md"), "utf-8");
const example = readFileSync(join(booksDir, "psychology", "atomic-habits.md"), "utf-8");

// Create MCP Server
const server = new McpServer({
  name: "books-for-agents",
  version: "1.0.0",
});

// --- Tools ---

server.tool(
  "search_books",
  "Search for books by topic, keyword, or theme. Returns relevant book summaries with relevance scores.",
  {
    query: z.string().describe("Search query (topic, keyword, or question)"),
    category: z
      .string()
      .optional()
      .describe("Filter by category (business, psychology, technology, self-improvement)"),
    limit: z
      .number()
      .optional()
      .describe("Max number of results (default: 5)"),
  },
  async (input) => {
    const result = searchBooks(engine, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_book",
  "Get the full structured summary of a specific book by slug or title.",
  {
    slug: z.string().optional().describe("Book slug (filename without .md)"),
    title: z.string().optional().describe("Book title (partial match supported)"),
  },
  async (input) => {
    const result = getBook(books, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "get_book_section",
  "Get a specific section of a book summary to save tokens. Sections: ideas, frameworks, quotes, connections, when-to-use.",
  {
    slug: z.string().describe("Book slug (filename without .md)"),
    section: z
      .enum(["ideas", "frameworks", "quotes", "connections", "when-to-use"])
      .describe("Section to retrieve"),
  },
  async (input) => {
    const result = getBookSection(books, input);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "list_categories",
  "List all available book categories with book counts.",
  {},
  async () => {
    const result = listCategories(books);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "list_backlog",
  "List all books in the generation backlog with their status (pending, done, skipped). Shows which books are available for contributors to generate.",
  {},
  async () => {
    const githubToken = process.env.GITHUB_TOKEN || "";
    const result = await listBacklog(backlog, githubToken);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "generate_book",
  "Get the full context (template, example, metadata, instructions) to generate a book summary. The agent generates the content using its own tokens, then calls submit_book to submit it.",
  {
    title: z
      .string()
      .optional()
      .describe("Book title from the backlog (omit to pick the next pending book)"),
  },
  async (input) => {
    const githubToken = process.env.GITHUB_TOKEN || "";
    const result = await generateBook(books, backlog, template, example, input, githubToken);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

server.tool(
  "submit_book",
  "Submit a generated book summary as a GitHub Issue for review. Call this after generating content with generate_book.",
  {
    slug: z.string().describe("Book slug (e.g. the-power-of-habit)"),
    title: z.string().describe("Book title"),
    author: z.string().describe("Book author"),
    category: z.string().describe("Book category (business, psychology, technology, self-improvement)"),
    content: z.string().describe("The full generated markdown content (starting with --- frontmatter)"),
  },
  async (input) => {
    const githubToken = process.env.GITHUB_TOKEN || "";
    const result = await submitBook(input, githubToken);
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  }
);

// --- Resources ---

server.resource(
  "catalog",
  "books://catalog",
  { description: "Complete catalog with metadata for all books" },
  async () => {
    const catalog = books.map((b) => ({
      ...b.metadata,
      oneLiner: b.oneLiner,
    }));
    return {
      contents: [
        {
          uri: "books://catalog",
          mimeType: "application/json",
          text: JSON.stringify(catalog, null, 2),
        },
      ],
    };
  }
);

for (const book of books) {
  server.resource(
    book.metadata.slug,
    `books://${book.metadata.slug}`,
    { description: `Full summary: ${book.metadata.title} by ${book.metadata.author}` },
    async () => {
      return {
        contents: [
          {
            uri: `books://${book.metadata.slug}`,
            mimeType: "text/markdown",
            text: book.content,
          },
        ],
      };
    }
  );
}

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
