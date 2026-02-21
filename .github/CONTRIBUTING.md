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

You can contribute by donating token processing to generate book summaries from the backlog:

1. Clone the repo and install dependencies:
   ```bash
   git clone https://github.com/danpalmieri/books-for-agents.git
   cd books-for-agents
   npm install
   ```
2. Set your Anthropic API key:
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   ```
3. Generate the next pending book:
   ```bash
   npm run generate -- --pick
   ```
   Or generate a specific book:
   ```bash
   npm run generate -- "The Power of Habit"
   ```
4. Preview cost without calling the API:
   ```bash
   npm run generate -- --pick --dry-run
   ```
5. Review the generated file in `books/{category}/` and make manual adjustments if needed
6. Validate and open a PR following the usual process:
   ```bash
   npm run validate
   npm run build:data
   git checkout -b add/book-slug
   ```

**Estimated cost per book:** ~$0.12 (Sonnet), ~$0.36 with retries.

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
