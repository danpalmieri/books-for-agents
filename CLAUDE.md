# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Books for Agents is an open-source knowledge base of structured book summaries served to AI agents via MCP (Model Context Protocol). It has two deployment targets: a local stdio server (`src/index.ts`) and a Cloudflare Worker HTTP server (`src/worker.ts`).

## Commands

```bash
npm run build          # Compile TypeScript (stdio server) → dist/
npm run dev            # Watch mode for development
npm run validate       # Validate all book markdown files against template rules
npm run build:data     # Generate books-data.json from .md files (required before worker)
npm run build:worker   # Build Cloudflare Worker (dry-run)
npm run dev:worker     # Run Worker locally on localhost:8787
npm run deploy         # Build data + deploy to Cloudflare Workers
npm start              # Run compiled stdio server
```

## Architecture

### Two Server Targets

- **Stdio server** (`src/index.ts`): Uses `@modelcontextprotocol/sdk` with `StdioServerTransport`. Loads books from filesystem at startup. Published to npm as `books-for-agents`.
- **HTTP Worker** (`src/worker.ts`): Cloudflare Worker implementing JSON-RPC 2.0 manually (no MCP SDK). Reads books from `generated/books-data.json` bundled at build time. Deployed to `booksforagents.com/mcp`.

Both servers expose the same 7 MCP tools and 2 resource types, but the Worker implements the protocol manually while the stdio server uses the SDK.

### Data Flow

Book `.md` files in `books/` → `scripts/build-books-data.ts` → `generated/books-data.json` → Worker imports this JSON at build time. The stdio server reads `.md` files directly from the filesystem.

### Key Modules

- `src/utils/markdown-parser.ts`: Custom frontmatter parser and section extractor. Supports bilingual headings (EN/PT).
- `src/utils/search-engine.ts`: TF-IDF search with scoring boosts for title (+2), tags (+1.5), and "when to use" section (+1).
- `src/tools/`: Each tool is a pure function receiving data and returning results. Shared between both servers.
- `src/types.ts`: Core `Book` and `BookMetadata` interfaces.

### Book Content

Books live in `books/{category}/` as markdown files. Categories: business, psychology, technology, self-improvement. Each book has YAML frontmatter and 5 required sections: Key Ideas, Frameworks and Models, Key Quotes, Connections with Other Books, When to Use This Knowledge. Template at `books/_template.md`. Backlog of pending books in `books/backlog.yml`.

### Build Exclusions

`tsconfig.json` excludes `src/worker.ts` from the Node build. The Worker is compiled separately by `wrangler`.

## Content Standards

- Book summaries must have 50+ non-empty lines, all required frontmatter fields, valid category, all 5 sections, at least one "**Practical application:**", and a one-liner summary.
- Content must be in English. Section headings are supported in both English and Portuguese.
- Connections between books use `[[slug]]` format referencing existing books only.

## Environment Variables

- `GITHUB_TOKEN`: Required by `submit_book` tool for creating GitHub Issues. Set as Cloudflare secret for production (`npx wrangler secret put GITHUB_TOKEN`).
- `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`: GitHub Actions secrets for deployment.

## Git Conventions

- Commit format for new books: `Add: Book Title — Author`
