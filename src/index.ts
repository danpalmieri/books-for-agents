#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { loadAllBooks } from "./utils/markdown-parser.js";
import { SearchEngine } from "./utils/search-engine.js";
import { searchBooks } from "./tools/search-books.js";
import { getBook, getBookSection } from "./tools/get-book.js";
import { listCategories } from "./tools/list-categories.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const booksDir = join(__dirname, "..", "books");

// Load and index books
const books = loadAllBooks(booksDir);
const engine = new SearchEngine();
engine.index(books);

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
