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

### Claude Desktop

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

### Claude Code

```bash
claude mcp add books-for-agents -- npx -y books-for-agents
```

### Cursor

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

### Local installation (development)

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

## Project structure

```
books-for-agents/
├── src/
│   ├── index.ts                 # MCP Server
│   ├── tools/                   # Tools implementation
│   └── utils/                   # Parser and search engine
├── books/
│   ├── _template.md             # Template for new books
│   ├── business/
│   ├── psychology/
│   ├── technology/
│   └── self-improvement/
└── scripts/
    └── validate-books.ts        # Book validation
```

## Licenses

- **Code:** [MIT](LICENSE)
- **Book content:** [CC BY-SA 4.0](LICENSE-CONTENT)

The summaries are original analyses and structured insights, not copies of copyrighted content.

## Author

**Daniel Palmieri** — [@danpalmieri](https://github.com/danpalmieri)
