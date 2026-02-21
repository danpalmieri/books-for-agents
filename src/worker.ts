/**
 * Books for Agents — Cloudflare Worker
 * Remote MCP Server over Streamable HTTP (JSON-RPC 2.0)
 */

import type { Book } from "./types.js";
import booksData from "../generated/books-data.json";
import generationData from "../generated/generation-data.json";
import { SearchEngine } from "./utils/search-engine.js";
import { searchBooks } from "./tools/search-books.js";
import { getBook, getBookSection } from "./tools/get-book.js";
import { listCategories } from "./tools/list-categories.js";
import { generateBook, listBacklog, type BacklogEntry } from "./tools/generate-book.js";
import { submitBook } from "./tools/submit-book.js";

interface Env {
  GITHUB_TOKEN?: string;
}

// --- Init ---

const books: Book[] = booksData as unknown as Book[];
const engine = new SearchEngine();
engine.index(books);

const backlog: BacklogEntry[] = generationData.backlog as unknown as BacklogEntry[];
const genTemplate: string = generationData.template;
const genExample: string = generationData.example;

// --- CORS ---

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Session-Id",
};

function corsResponse(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// --- MCP Tool Definitions ---

const TOOLS = [
  {
    name: "search_books",
    description:
      "Search for books by topic, keyword, or theme. Returns relevant book summaries with relevance scores.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "Search query (topic, keyword, or question)" },
        category: {
          type: "string",
          description: "Filter by category (business, psychology, technology, self-improvement)",
        },
        limit: { type: "number", description: "Max number of results (default: 5)" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_book",
    description: "Get the full structured summary of a specific book by slug or title.",
    inputSchema: {
      type: "object" as const,
      properties: {
        slug: { type: "string", description: "Book slug (filename without .md)" },
        title: { type: "string", description: "Book title (partial match supported)" },
      },
    },
  },
  {
    name: "get_book_section",
    description:
      "Get a specific section of a book summary to save tokens. Sections: ideas, frameworks, quotes, connections, when-to-use.",
    inputSchema: {
      type: "object" as const,
      properties: {
        slug: { type: "string", description: "Book slug (filename without .md)" },
        section: {
          type: "string",
          enum: ["ideas", "frameworks", "quotes", "connections", "when-to-use"],
          description: "Section to retrieve",
        },
      },
      required: ["slug", "section"],
    },
  },
  {
    name: "list_categories",
    description: "List all available book categories with book counts.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "list_backlog",
    description:
      "List all books in the generation backlog with their status (pending, done, skipped). Shows which books are available for contributors to generate.",
    inputSchema: { type: "object" as const, properties: {} },
  },
  {
    name: "generate_book",
    description:
      "Get the full context (template, example, metadata, instructions) to generate a book summary. The agent generates the content using its own tokens, then calls submit_book to submit it.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: {
          type: "string",
          description: "Book title from the backlog (omit to pick the next pending book)",
        },
      },
    },
  },
  {
    name: "submit_book",
    description:
      "Submit a generated book summary as a GitHub Issue for review. Call this after generating content with generate_book.",
    inputSchema: {
      type: "object" as const,
      properties: {
        slug: { type: "string", description: "Book slug (e.g. the-power-of-habit)" },
        title: { type: "string", description: "Book title" },
        author: { type: "string", description: "Book author" },
        category: {
          type: "string",
          description: "Book category (business, psychology, technology, self-improvement)",
        },
        content: {
          type: "string",
          description: "The full generated markdown content (starting with --- frontmatter)",
        },
      },
      required: ["slug", "title", "author", "category", "content"],
    },
  },
];

// --- MCP Resource Definitions ---

function buildResourcesList() {
  const resources = [
    {
      uri: "books://catalog",
      name: "catalog",
      description: "Complete catalog with metadata for all books",
      mimeType: "application/json",
    },
  ];
  for (const book of books) {
    resources.push({
      uri: `books://${book.metadata.slug}`,
      name: book.metadata.slug,
      description: `Full summary: ${book.metadata.title} by ${book.metadata.author}`,
      mimeType: "text/markdown",
    });
  }
  return resources;
}

function readResource(uri: string) {
  if (uri === "books://catalog") {
    const catalog = books.map((b) => ({ ...b.metadata, oneLiner: b.oneLiner }));
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(catalog, null, 2) }] };
  }

  const slug = uri.replace("books://", "");
  const book = books.find((b) => b.metadata.slug === slug);
  if (!book) return { contents: [], error: "Resource not found" };

  return { contents: [{ uri, mimeType: "text/markdown", text: book.content }] };
}

// --- Tool Execution ---

function callTool(name: string, args: Record<string, unknown>, env: Env) {
  switch (name) {
    case "search_books":
      return searchBooks(engine, args as { query: string; category?: string; limit?: number });
    case "get_book":
      return getBook(books, args as { slug?: string; title?: string });
    case "get_book_section":
      return getBookSection(books, args as { slug: string; section: "ideas" | "frameworks" | "quotes" | "connections" | "when-to-use" });
    case "list_categories":
      return listCategories(books);
    case "list_backlog":
      return listBacklog(backlog, env.GITHUB_TOKEN || "");
    case "generate_book":
      return generateBook(books, backlog, genTemplate, genExample, args as { title?: string }, env.GITHUB_TOKEN || "");
    case "submit_book":
      return submitBook(
        args as { slug: string; title: string; author: string; category: string; content: string },
        env.GITHUB_TOKEN || ""
      );
    default:
      return null;
  }
}

// --- JSON-RPC Handler ---

interface JsonRpcRequest {
  jsonrpc: string;
  id?: string | number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

async function handleMessage(msg: JsonRpcRequest, env: Env): Promise<JsonRpcResponse | null> {
  // Notifications (no id) don't get responses
  if (msg.id === undefined || msg.id === null) return null;

  const respond = (result: unknown): JsonRpcResponse => ({
    jsonrpc: "2.0",
    id: msg.id!,
    result,
  });

  const error = (code: number, message: string): JsonRpcResponse => ({
    jsonrpc: "2.0",
    id: msg.id!,
    error: { code, message },
  });

  switch (msg.method) {
    case "initialize":
      return respond({
        protocolVersion: "2024-11-05",
        capabilities: {
          tools: { listChanged: false },
          resources: { listChanged: false },
        },
        serverInfo: { name: "books-for-agents", version: "1.0.0" },
      });

    case "ping":
      return respond({});

    case "tools/list":
      return respond({ tools: TOOLS });

    case "tools/call": {
      const toolName = msg.params?.name as string;
      const toolArgs = (msg.params?.arguments ?? {}) as Record<string, unknown>;
      const result = await callTool(toolName, toolArgs, env);
      if (result === null) {
        return error(-32602, `Unknown tool: ${toolName}`);
      }
      return respond({
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      });
    }

    case "resources/list":
      return respond({ resources: buildResourcesList() });

    case "resources/read": {
      const uri = msg.params?.uri as string;
      if (!uri) return error(-32602, "Missing uri parameter");
      return respond(readResource(uri));
    }

    default:
      return error(-32601, `Method not found: ${msg.method}`);
  }
}

// --- Fetch Handler ---

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return corsResponse();
    }

    const url = new URL(request.url);

    // Health check / info
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/mcp")) {
      return json({
        name: "books-for-agents",
        version: "1.0.0",
        description: "Open source knowledge base of book summaries for AI agents",
        mcp: "Use POST /mcp with JSON-RPC 2.0 to interact",
        books: books.length,
        tools: TOOLS.map((t) => t.name),
      });
    }

    // MCP endpoint
    if (request.method === "POST" && (url.pathname === "/" || url.pathname === "/mcp")) {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json(
          { jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } },
          400
        );
      }

      const messages: JsonRpcRequest[] = Array.isArray(body) ? body : [body as JsonRpcRequest];
      const responses: JsonRpcResponse[] = [];

      for (const msg of messages) {
        const res = await handleMessage(msg, env);
        if (res) responses.push(res);
      }

      if (responses.length === 0) {
        return new Response(null, { status: 202, headers: CORS_HEADERS });
      }

      return json(responses.length === 1 ? responses[0] : responses);
    }

    // Session delete (stateless — always OK)
    if (request.method === "DELETE") {
      return new Response(null, { status: 200, headers: CORS_HEADERS });
    }

    return json({ error: "Not found" }, 404);
  },
};
