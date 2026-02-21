# Books for Agents

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
| **Psychology** | Thinking Fast and Slow, Atomic Habits, The Power of Habit |
| **Technology** | The Pragmatic Programmer, Clean Code |
| **Self-Improvement** | Deep Work, The 7 Habits of Highly Effective People |

**9 books available** — and growing. Use `suggest_book` to add more to the backlog.

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
| `suggest_book` | Suggest a new book to add to the backlog. Checks for duplicates automatically. |
| `list_backlog` | See all pending books and their status. |
| `generate_book` | Get template, example, and metadata to generate the next book summary. |
| `submit_book` | Publish a generated summary directly to the knowledge base. |

## MCP Resources

- `books://catalog` — Full catalog with metadata for all books
- `books://{slug}` — Full summary of a specific book

## How to contribute

### Donate Your Tokens

If you already have Books for Agents connected to your agent, just ask:

> "Generate the next book from the backlog"

Your agent will call `generate_book` to get the context, generate the summary with its own tokens, and `submit_book` to publish it directly to the knowledge base. No cloning, no PRs, no setup needed.

You can also suggest new books:

> "Suggest adding Thinking in Bets by Annie Duke"

Your agent will call `suggest_book` to add it to the backlog.

## Deploy your own

The project deploys to Cloudflare Workers with D1 as the database.

```bash
git clone https://github.com/danpalmieri/books-for-agents.git
cd books-for-agents
npm install
npm run deploy
```

For local development:

```bash
npm run dev:worker
```

## Licenses

- **Code:** [MIT](LICENSE)
- **Book content:** [CC BY-SA 4.0](LICENSE-CONTENT)

The summaries are original analyses and structured insights, not copies of copyrighted content.

## Community

**Daniel Palmieri** — [@dlpalmieri](https://x.com/dlpalmieri)
