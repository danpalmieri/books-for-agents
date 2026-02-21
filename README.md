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

## Installation

### Via npx (recommended)

```bash
npx books-for-agents
```

### Local installation

```bash
git clone https://github.com/danpalmieri/books-for-agents.git
cd books-for-agents
npm install
npm run build
```

## MCP Server Configuration

### Remote server (recommended)

The server is deployed on Cloudflare Workers and available at:

```
https://booksforagents.com/mcp
```

#### Claude Desktop (remote)

```json
{
  "mcpServers": {
    "books-for-agents": {
      "type": "streamable-http",
      "url": "https://booksforagents.com/mcp"
    }
  }
}
```

#### Claude Code (remote)

```bash
claude mcp add books-for-agents --transport http https://booksforagents.com/mcp
```

#### Cursor (remote)

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

#### Claude Desktop

Add to your `claude_desktop_config.json`:

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

**Config file path:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

#### Claude Code

```bash
claude mcp add books-for-agents -- npx -y books-for-agents
```

#### Cursor

Add to your project's `.cursor/mcp.json`:

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

#### Local development

If you cloned the repository:

```json
{
  "mcpServers": {
    "books-for-agents": {
      "command": "node",
      "args": ["dist/index.js"]
    }
  }
}
```

## Available tools

### `search_books`

Search books by topic, keyword, or question.

```json
{
  "query": "how to lead a team",
  "category": "business",
  "limit": 3
}
```

### `get_book`

Returns the full summary of a book.

```json
{
  "slug": "how-to-win-friends-and-influence-people"
}
```

Or by title:

```json
{
  "title": "Lean Startup"
}
```

### `get_book_section`

Returns a specific section to save tokens.

```json
{
  "slug": "atomic-habits",
  "section": "frameworks"
}
```

Available sections: `ideas`, `frameworks`, `quotes`, `connections`, `when-to-use`

### `list_categories`

Lists all categories with book counts.

## MCP Resources

- `books://catalog` — Full catalog with metadata for all books
- `books://{slug}` — Full summary of a specific book

## How to contribute

See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for detailed guidelines.

### Quick summary

1. Fork the repository
2. Copy `books/_template.md` to the correct category
3. Write the summary following the template
4. Run `npm run validate` to check
5. Open a PR

### Donate Your Tokens

You can also contribute by donating token processing to generate summaries from the [backlog](books/backlog.yml) using your own Anthropic API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npm run generate -- --pick
```

This picks the next pending book, generates a summary using Claude, and validates it automatically. See [CONTRIBUTING.md](.github/CONTRIBUTING.md) for details.

## Deploy your own

The project deploys to Cloudflare Workers. The book `.md` files are bundled into JSON at build time.

```bash
git clone https://github.com/danpalmieri/books-for-agents.git
cd books-for-agents
npm install
npm run deploy
```

This runs `build:data` (generates `generated/books-data.json` from the `.md` files) and then `wrangler deploy`.

For local development of the worker:

```bash
npm run build:data
npm run dev:worker
```

## Project structure

```
books-for-agents/
├── src/
│   ├── index.ts                 # Local MCP Server (stdio)
│   ├── worker.ts                # Cloudflare Worker (remote HTTP)
│   ├── types.ts                 # Shared types
│   ├── tools/                   # Tool implementations
│   └── utils/                   # Parser and search engine
├── books/
│   ├── _template.md             # Template for new books
│   ├── backlog.yml              # Books pending generation
│   ├── business/
│   ├── psychology/
│   ├── technology/
│   └── self-improvement/
├── scripts/
│   ├── build-books-data.ts      # Generates JSON bundle from .md files
│   ├── validate-books.ts        # Book validation
│   ├── generate-book.ts         # AI-powered book summary generator
│   └── prompts/
│       └── generate-summary.ts  # Prompt builder for generation
└── wrangler.toml                # Cloudflare Workers config
```

## Licenses

- **Code:** [MIT](LICENSE)
- **Book content:** [CC BY-SA 4.0](LICENSE-CONTENT)

The summaries are original analyses and structured insights, not copies of copyrighted content.

## Author

**Daniel Palmieri** — [@dlpalmieri](https://x.com/dlpalmieri)
