# 📚 Books for Agents

An open source knowledge base of structured book summaries, optimized for consumption by LLMs and AI agents via **MCP (Model Context Protocol)**.

Any AI agent can connect and retrieve book knowledge to enrich its responses.

## How it works

```
User: "Help me influence people at work"
    ↓
Agent queries Books for Agents via MCP
    ↓
Finds "How to Win Friends and Influence People"
    ↓
Uses structured knowledge in its response
```

## Available books

| Category | Books |
|----------|-------|
| **Business** | How to Win Friends and Influence People, The Lean Startup |
| **Psychology** | Thinking Fast and Slow, Atomic Habits |
| **Technology** | The Pragmatic Programmer, Clean Code |
| **Self-Improvement** | Deep Work, The 7 Habits of Highly Effective People |

**8 books available** + [22 in the backlog](books/backlog.yml) waiting for contributors.

## Installation

### Remote server (recommended)

No install needed. The server is deployed on Cloudflare Workers:

```
https://booksforagents.com/mcp
```

### Claude Desktop

```json
{
  "mcpServers": {
    "books-for-agents": {
      "url": "https://booksforagents.com/mcp"
    }
  }
}
```

### Claude Code

```bash
claude mcp add books-for-agents --transport http https://booksforagents.com/mcp
```

### Cursor

```json
{
  "mcpServers": {
    "books-for-agents": {
      "url": "https://booksforagents.com/mcp"
    }
  }
}
```

### Local server (stdio)

For local development or offline use:

```bash
npx books-for-agents
```

Or clone and build:

```bash
git clone https://github.com/danpalmieri/books-for-agents.git
cd books-for-agents
npm install && npm run build
```

Then add to your MCP client config:

```json
{
  "mcpServers": {
    "books-for-agents": {
      "command": "npx",
      "args": ["-y", "books-for-agents"]
    }
  }
}
```

## Available tools

### Reading

| Tool | Description |
|------|-------------|
| `search_books` | Search by topic, keyword, or question. Supports category filtering. |
| `get_book` | Get full summary by slug or title (partial match). |
| `get_book_section` | Get a specific section (`ideas`, `frameworks`, `quotes`, `connections`, `when-to-use`) to save tokens. |
| `list_categories` | List all categories with book counts. |

### Contributing

| Tool | Description |
|------|-------------|
| `list_backlog` | See all pending books and their status. |
| `generate_book` | Get template, example, and metadata to generate the next book summary. |
| `submit_book` | Submit a generated summary as a GitHub Issue for review. |

## MCP Resources

- `books://catalog` — Full catalog with metadata for all books
- `books://{slug}` — Full summary of a specific book

## How to contribute

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for detailed guidelines.

### Donate Your Tokens

If you already have Books for Agents connected to your agent, just ask:

> "Generate the next book from the backlog"

Your agent will call `generate_book` to get the context, generate the summary with its own tokens, and `submit_book` to create a GitHub Issue automatically. No cloning or setup needed.

### Write manually

1. Fork the repository
2. Copy `books/_template.md` to the correct category
3. Write the summary following the template
4. Run `npm run validate` to check
5. Open a PR

## Deploy your own

The project deploys to Cloudflare Workers. Book `.md` files are bundled into JSON at build time.

```bash
git clone https://github.com/danpalmieri/books-for-agents.git
cd books-for-agents
npm install
npm run deploy
```

For the `submit_book` tool to work, configure the GitHub token:

```bash
npx wrangler secret put GITHUB_TOKEN
```

For local development:

```bash
npm run build:data
npm run dev:worker
```

## Project structure

```
books-for-agents/
├── src/
│   ├── index.ts                    # Local MCP Server (stdio)
│   ├── worker.ts                   # Cloudflare Worker (remote HTTP)
│   ├── types.ts                    # Shared types
│   ├── tools/
│   │   ├── search-books.ts         # Search with TF-IDF scoring
│   │   ├── get-book.ts             # Book retrieval by slug/title
│   │   ├── list-categories.ts      # Category aggregation
│   │   ├── generate-book.ts        # Generation context + backlog
│   │   └── submit-book.ts          # GitHub Issue submission
│   └── utils/
│       ├── markdown-parser.ts      # Book file parsing
│       └── search-engine.ts        # TF-IDF search engine
├── books/
│   ├── _template.md                # Template for new books
│   ├── backlog.yml                 # 22 books pending generation
│   ├── business/
│   ├── psychology/
│   ├── technology/
│   └── self-improvement/
├── scripts/
│   ├── build-books-data.ts         # Bundles books + backlog into JSON
│   ├── validate-books.ts           # Book validation
│   ├── generate-book.ts            # CLI for local generation
│   └── prompts/
│       └── generate-summary.ts     # Prompt builder for CLI
└── wrangler.toml                   # Cloudflare Workers config
```

## Licenses

- **Code:** [MIT](LICENSE)
- **Book content:** [CC BY-SA 4.0](LICENSE-CONTENT)

The summaries are original analyses and structured insights, not copies of copyrighted content.

## Author

**Daniel Palmieri** — [@dlpalmieri](https://x.com/dlpalmieri)
