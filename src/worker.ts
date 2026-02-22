/**
 * Books for Agents — Cloudflare Worker
 * Remote MCP Server over Streamable HTTP (JSON-RPC 2.0)
 */

import type { BookStore } from "./store/book-store.js";
import { D1BookStore } from "./store/d1-store.js";
import { searchBooks } from "./tools/search-books.js";
import { getBook, getBookSection } from "./tools/get-book.js";
import { listCategories } from "./tools/list-categories.js";
import { generateBook, listBacklog } from "./tools/generate-book.js";
import { submitBook } from "./tools/submit-book.js";
import { suggestBook } from "./tools/suggest-book.js";
import { listBooksByAuthor } from "./tools/list-books-by-author.js";
import { renderBookPage } from "./pages/book-detail.js";
import { renderSitemap } from "./pages/sitemap.js";
import { renderNotFoundPage } from "./pages/not-found.js";

interface Env {
  DB: D1Database;
  VECTORIZE: Vectorize;
  AI: Ai;
  ADMIN_TOKEN?: string;
}

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

function html(body: string, status = 200, cacheSeconds = 300, sCacheSeconds = 3600): Response {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": `public, max-age=${cacheSeconds}, s-maxage=${sCacheSeconds}`,
    },
  });
}

function xml(body: string, cacheSeconds = 3600, sCacheSeconds = 86400): Response {
  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": `public, max-age=${cacheSeconds}, s-maxage=${sCacheSeconds}`,
    },
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
    name: "list_books_by_author",
    description:
      "List all books by a specific author. Supports partial name matching (e.g. 'Clear' matches 'James Clear').",
    inputSchema: {
      type: "object" as const,
      properties: {
        author: { type: "string", description: "Author name or partial name to search for" },
      },
      required: ["author"],
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
      "Publish a generated book summary directly to the knowledge base. Call this after generating content with generate_book.",
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
  {
    name: "suggest_book",
    description:
      "Suggest a new book to add to the generation backlog. Inserts directly into the backlog. Checks for duplicates against published books and existing backlog entries.",
    inputSchema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Book title" },
        author: { type: "string", description: "Book author" },
        category: {
          type: "string",
          enum: ["business", "psychology", "technology", "self-improvement"],
          description: "Book category",
        },
        year: { type: "number", description: "Publication year" },
        tags: {
          type: "array",
          items: { type: "string" },
          description: "Relevant tags",
        },
        isbn: { type: "string", description: "ISBN" },
        reason: { type: "string", description: "Why this book should be added" },
      },
      required: ["title", "author", "category"],
    },
  },
];

// --- MCP Resource Definitions ---

async function buildResourcesList(store: BookStore) {
  const allBooks = await store.getAllBooks();
  const resources = [
    {
      uri: "books://catalog",
      name: "catalog",
      description: "Complete catalog with metadata for all books",
      mimeType: "application/json",
    },
  ];
  for (const book of allBooks) {
    resources.push({
      uri: `books://${book.metadata.slug}`,
      name: book.metadata.slug,
      description: `Full summary: ${book.metadata.title} by ${book.metadata.author}`,
      mimeType: "text/markdown",
    });
  }
  return resources;
}

async function readResource(store: BookStore, uri: string) {
  if (uri === "books://catalog") {
    const allBooks = await store.getAllBooks();
    const catalog = allBooks.map((b) => ({ ...b.metadata, oneLiner: b.oneLiner }));
    return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(catalog, null, 2) }] };
  }

  const slug = uri.replace("books://", "");
  const book = await store.getBySlug(slug);
  if (!book) return { contents: [], error: "Resource not found" };

  return { contents: [{ uri, mimeType: "text/markdown", text: book.content }] };
}

// --- Tool Execution ---

async function callTool(name: string, args: Record<string, unknown>, store: BookStore) {
  switch (name) {
    case "search_books":
      return searchBooks(store, args as { query: string; category?: string; limit?: number });
    case "get_book":
      return getBook(store, args as { slug?: string; title?: string });
    case "get_book_section":
      return getBookSection(store, args as { slug: string; section: "ideas" | "frameworks" | "quotes" | "connections" | "when-to-use" });
    case "list_books_by_author":
      return listBooksByAuthor(store, args as { author: string });
    case "list_categories":
      return listCategories(store);
    case "list_backlog":
      return listBacklog(store);
    case "generate_book":
      return generateBook(store, args as { title?: string });
    case "submit_book":
      return submitBook(
        args as { slug: string; title: string; author: string; category: string; content: string },
        store
      );
    case "suggest_book":
      return suggestBook(
        args as { title: string; author: string; category: string; year?: number; tags?: string[]; isbn?: string; reason?: string },
        store
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

async function handleMessage(msg: JsonRpcRequest, store: BookStore, env: Env): Promise<JsonRpcResponse | null> {
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
      const result = await callTool(toolName, toolArgs, store);
      if (result === null) {
        return error(-32602, `Unknown tool: ${toolName}`);
      }
      return respond({
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      });
    }

    case "resources/list":
      return respond({ resources: await buildResourcesList(store) });

    case "resources/read": {
      const uri = msg.params?.uri as string;
      if (!uri) return error(-32602, "Missing uri parameter");
      return respond(await readResource(store, uri));
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

    const store = new D1BookStore(env.DB, env.VECTORIZE, env.AI);

    const url = new URL(request.url);

    // Admin: reindex Vectorize embeddings
    if (request.method === "POST" && url.pathname === "/_admin/reindex") {
      const auth = request.headers.get("Authorization");
      if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
        return json({ error: "Unauthorized" }, 401);
      }
      const result = await store.reindexVectors();
      return json(result);
    }

    // Reject SSE polling — MCP clients expecting Streamable HTTP SSE will
    // reconnect in a tight loop if we reply 200.  Return 405 so they stop.
    if (request.method === "GET" && url.pathname === "/mcp" && request.headers.get("Accept")?.includes("text/event-stream")) {
      return new Response("SSE not supported. Use POST with JSON-RPC 2.0.", {
        status: 405,
        headers: { "Allow": "POST", ...CORS_HEADERS },
      });
    }

    // Health check / info
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/mcp")) {
      const slugs = await store.getAllSlugs();
      return json({
        name: "books-for-agents",
        version: "1.0.0",
        description: "Open source knowledge base of book summaries for AI agents",
        mcp: "Use POST /mcp with JSON-RPC 2.0 to interact",
        books: slugs.length,
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
        const res = await handleMessage(msg, store, env);
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

    const baseUrl = url.origin;

    // Catalog API
    if (request.method === "GET" && url.pathname === "/api/catalog") {
      const books = await store.getRecentBooksMeta(100);
      return new Response(JSON.stringify(books), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300, s-maxage=3600",
          ...CORS_HEADERS,
        },
      });
    }

    // Sitemap
    if (request.method === "GET" && url.pathname === "/sitemap.xml") {
      const slugs = await store.getAllSlugs();
      return xml(renderSitemap(slugs, baseUrl));
    }

    // Book detail page
    const bookMatch = url.pathname.match(/^\/books\/([a-z0-9-]+)$/);
    if (request.method === "GET" && bookMatch) {
      const book = await store.getBySlug(bookMatch[1]);
      if (book) {
        return html(renderBookPage(book, baseUrl));
      }
      return html(renderNotFoundPage(baseUrl), 404);
    }

    return json({ error: "Not found" }, 404);
  },
};
