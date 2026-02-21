# Contributing to Books for Agents

Thank you for your interest in contributing! This guide explains how to add new books and contribute to the project.

## Adding a new book

### 1. Choose a book

- Non-fiction books with practical and applicable insights
- Widely recognized and recommended books in their field
- Avoid very niche or obscure books (at least initially)

### 2. Create the file

1. Copy `books/_template.md`
2. Rename it to the book's slug: `book-name-in-english.md`
3. Place it in the correct category inside `books/`

**Existing categories:**
- `business/` — Business, entrepreneurship, management
- `psychology/` — Psychology, behavior, behavioral economics
- `technology/` — Programming, software engineering, technology
- `self-improvement/` — Personal development, productivity

To suggest a new category, open an issue first.

### 3. Write the summary

**Follow the template strictly.** Each book must contain:

- **Frontmatter** with all required fields (title, author, year, category, tags, language)
- **One-sentence summary** that captures the essence of the book
- **5-7 Key Ideas** with 2-3 paragraphs each and a **Practical application** for each
- **Frameworks and Models** — methodologies and mental models from the book
- **Key Quotes** — 3-5 relevant quotes
- **Connections with Other Books** — references to other books in the repository using `[[slug]]`
- **When to Use This Knowledge** — situations where an agent should refer to this book

### 4. Content guidelines

- Write in **English** (the template uses English headings)
- Existing books in Portuguese are also accepted — the validator and parser support both languages
- Focus on **structured insights and original analysis**, not content reproduction
- Extract **frameworks, mental models, and practical applications**
- Minimum of **50 non-empty lines** of content (excluding frontmatter)
- Each idea must have a clearly defined **Practical application**
- Connections should reference books that exist in the repository using `[[slug]]`

### 5. Validate

```bash
npm run validate
```

The script checks if the book follows the template correctly (works with both English and Portuguese headings).

### 6. Open a PR

- Branch: `add/book-slug`
- Title: `Add: Book Name — Author`
- Description: brief explanation of why this book is relevant

## Generate with AI (Donate Your Tokens)

You can contribute by donating token processing to generate book summaries. If you already have Books for Agents connected to your AI agent, just ask:

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

### Alternative: CLI workflow

You can also generate books locally using the CLI:

```bash
git clone https://github.com/danpalmieri/books-for-agents.git
cd books-for-agents && npm install
export ANTHROPIC_API_KEY=sk-ant-...
npm run generate -- --pick
```

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
| `npm run generate` | Generate a book summary using Claude AI |

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
