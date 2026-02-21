# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Books for Agents is an open-source knowledge base of structured book summaries served to AI agents via MCP (Model Context Protocol). It runs as a Cloudflare Worker HTTP server (`src/worker.ts`) with D1 as the single source of truth for all data.

## Commands

```bash
npm run dev:worker     # Run Worker locally on localhost:8787
npm run deploy         # Deploy to Cloudflare Workers
npm run db:migrate     # Apply D1 migrations (production)
npm run db:migrate:local # Apply D1 migrations (local)
npm run db:reindex     # Reindex Vectorize embeddings
```

## Architecture

### Single Server Target

- **HTTP Worker** (`src/worker.ts`): Cloudflare Worker implementing JSON-RPC 2.0 manually (no MCP SDK). Reads/writes data from Cloudflare D1 database. Deployed to `booksforagents.com/mcp`.

The server exposes 8 MCP tools and 2 resource types. Write operations (`submit_book`, `suggest_book`) go directly to D1.

### Data Flow

All book data lives in D1. `submit_book` parses markdown content and inserts directly into D1 + Vectorize. `suggest_book` inserts directly into the backlog table.

### Key Modules

- `src/utils/markdown-parser.ts`: Custom frontmatter parser and section extractor. `parseBookFromContent(raw, slug)` parses raw markdown into a `Book` object. Supports bilingual headings (EN/PT).
- `src/utils/embeddings.ts`: Embedding text builder and score fusion for hybrid search (FTS + Vectorize).
- `src/store/book-store.ts`: `BookStore` interface with read and write methods.
- `src/store/d1-store.ts`: `D1BookStore` — D1 implementation with FTS5 search, Vectorize hybrid search, and write methods (`insertBook`, `insertBacklogEntry`, `updateBacklogStatus`).
- `src/tools/`: Each tool is a pure function receiving `BookStore` and returning results.
- `src/types.ts`: Core `Book` and `BookMetadata` interfaces.

### Book Content

Books are stored in the D1 `books` table. Categories: business, psychology, technology, self-improvement. Each book has 5 required sections: Key Ideas, Frameworks and Models, Key Quotes, Connections with Other Books, When to Use This Knowledge. Template and example are stored in the `generation_assets` table.

## Content Standards

- Book summaries must have all required frontmatter fields, valid category, all 5 sections, at least one "**Practical application:**", and a one-liner summary.
- Content must be in English. Section headings are supported in both English and Portuguese.
- Connections between books use `[[slug]]` format referencing existing books only.

## Environment Variables

- `ADMIN_TOKEN`: Required for the `/_admin/reindex` endpoint. Set as Cloudflare secret.
- `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`: GitHub Actions secrets for deployment.
