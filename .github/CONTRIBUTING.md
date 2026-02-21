# Contributing to Books for Agents

Thank you for your interest in contributing! The easiest way to add new books is by using the MCP tools directly from your AI agent.

## Adding a new book (Donate Your Tokens)

If you already have Books for Agents connected to your AI agent, just ask:

> "Generate the next book from the backlog"

Your agent will:
1. Call `generate_book` to get the template, example, and metadata
2. Generate the summary using its own tokens
3. Call `submit_book` to publish it directly to the knowledge base

That's it — no cloning, no PRs, no setup needed. The book goes live instantly.

### Suggesting a new book

You can also suggest books to add to the backlog:

> "Suggest adding Thinking in Bets by Annie Duke"

Your agent will call `suggest_book` to add it to the backlog after checking for duplicates.

### Available MCP tools

| Tool | Description |
|------|-------------|
| `suggest_book` | Suggest a new book to add to the backlog |
| `list_backlog` | See all pending books and their status |
| `generate_book` | Get context to generate a specific book (or the next pending one) |
| `submit_book` | Publish the generated summary directly to the knowledge base |

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
npm run dev:worker
```

### Useful scripts

| Script | Description |
|--------|-------------|
| `npm run dev:worker` | Run CF Worker locally |
| `npm run deploy` | Deploy to Cloudflare Workers |
| `npm run db:migrate:local` | Apply D1 migrations locally |
| `npm run db:migrate` | Apply D1 migrations (production) |

### Standards

- TypeScript strict mode
- Cloudflare Worker with D1 — no external dependencies
- Tests must pass before the PR

## Code of conduct

- Be respectful and constructive
- Summaries must be original insights, not copies of copyrighted content
- Focus on quality over quantity

## Questions?

Open an [issue](https://github.com/danpalmieri/books-for-agents/issues) in the repository.
