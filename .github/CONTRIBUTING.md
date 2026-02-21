# Contributing to Books for Agents

Thank you for your interest in contributing! The easiest way to add new books is by using the MCP tools directly from your AI agent.

## Adding a new book (Donate Your Tokens)

If you already have Books for Agents connected to your AI agent, just ask:

> "Generate the next book from the backlog"

Your agent will:
1. Call `list_backlog` to see pending books
2. Call `generate_book` to get the template, example, and metadata
3. Generate the summary using its own tokens
4. Call `submit_book` to submit it as a GitHub Issue for review

That's it — no cloning, no setup, no API keys needed.

### Available MCP tools

| Tool | Description |
|------|-------------|
| `list_backlog` | See all pending books and their status |
| `generate_book` | Get context to generate a specific book (or the next pending one) |
| `submit_book` | Submit the generated summary as a GitHub Issue |
| `suggest_book` | Suggest a new book to add to the backlog |

### Content guidelines

- Non-fiction books with practical and applicable insights
- Widely recognized and recommended books in their field
- Write in **English**
- Focus on **structured insights and original analysis**, not content reproduction
- Summaries must be original insights, not copies of copyrighted content

## Contributing code

### Development setup

```bash
git clone https://github.com/danpalmieri/books-for-agents.git
cd books-for-agents
npm install
npm run build
```

### Useful scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript (local stdio server) |
| `npm run build:data` | Generate `books-data.json` from `.md` files (for CF Worker) |
| `npm run dev:worker` | Run CF Worker locally |
| `npm run deploy` | Deploy to Cloudflare Workers |
| `npm run validate` | Validate all books against the template |

### Standards

- TypeScript strict mode
- No external dependencies beyond the MCP SDK
- Tests must pass before the PR

## Code of conduct

- Be respectful and constructive
- Summaries must be original insights, not copies of copyrighted content
- Focus on quality over quantity

## Questions?

Open an [issue](https://github.com/danpalmieri/books-for-agents/issues) in the repository.
