import type { Book } from "../types.js";
import { fetchExistingIssueTitles } from "./submit-book.js";

// --- List Backlog ---

export async function listBacklog(
  backlog: BacklogEntry[],
  githubToken: string
): Promise<object> {
  const issueTitles = await fetchExistingIssueTitles(githubToken);

  const books = backlog.map((b) => {
    const issueTitle = `Add: ${b.title} — ${b.author}`;
    const submitted = issueTitles.some((t) => t === issueTitle);
    return {
      title: b.title,
      author: b.author,
      category: b.category,
      status: submitted ? "submitted" : b.status,
    };
  });

  const pending = books.filter((b) => b.status === "pending");
  const submitted = books.filter((b) => b.status === "submitted");

  return {
    total: backlog.length,
    pending: pending.length,
    submitted: submitted.length,
    books,
  };
}

// --- Generate Book ---

export interface BacklogEntry {
  title: string;
  author: string;
  year: number;
  category: string;
  tags: string[];
  isbn: string;
  status: "pending" | "in-progress" | "done" | "skipped";
  contributor: string | null;
}

export interface GenerateBookInput {
  title?: string;
}

export async function generateBook(
  books: Book[],
  backlog: BacklogEntry[],
  template: string,
  example: string,
  input: GenerateBookInput,
  githubToken: string
): Promise<object> {
  // Fetch already-submitted issues to skip them
  const issueTitles = await fetchExistingIssueTitles(githubToken);

  function isAlreadySubmitted(entry: BacklogEntry): boolean {
    const issueTitle = `Add: ${entry.title} — ${entry.author}`;
    return issueTitles.some((t) => t === issueTitle);
  }

  // Find the book to generate
  let entry: BacklogEntry | undefined;

  if (input.title) {
    const titleLower = input.title.toLowerCase();
    entry = backlog.find(
      (b) =>
        b.status === "pending" &&
        b.title.toLowerCase().includes(titleLower) &&
        !isAlreadySubmitted(b)
    );
    if (!entry) {
      const pending = backlog
        .filter((b) => b.status === "pending" && !isAlreadySubmitted(b))
        .map((b) => b.title);
      return {
        error: `No available book matching "${input.title}" found in backlog (may already be submitted).`,
        pendingBooks: pending,
      };
    }
  } else {
    entry = backlog.find(
      (b) => b.status === "pending" && !isAlreadySubmitted(b)
    );
    if (!entry) {
      return { error: "No pending books in the backlog. All have been submitted or completed!" };
    }
  }

  const existingSlugs = books.map((b) => b.metadata.slug);

  const slug = entry.title
    .toLowerCase()
    .replace(/['':]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return {
    book: {
      title: entry.title,
      author: entry.author,
      year: entry.year,
      category: entry.category,
      tags: entry.tags,
      isbn: entry.isbn,
      slug,
    },
    instructions: [
      "Generate a complete book summary in Markdown following the template and example below.",
      "",
      "QUALITY REQUIREMENTS:",
      "- At least 150-200 non-empty lines of content (excluding frontmatter)",
      "- Include 5-7 Key Ideas, each with 2-3 substantive paragraphs and a **Practical application:** section",
      "- Frameworks and Models section should have 2-4 named frameworks with structured descriptions",
      "- Include 3-5 Key Quotes (use real, well-known quotes from the book)",
      "- Connections must reference existing books using [[slug]] format — ONLY use slugs from the list below",
      "- When to Use This Knowledge should list 5-8 specific scenarios",
      '- Write in English, set language: "en" in frontmatter',
      "- Focus on structured insights, original analysis, frameworks, and practical applications",
      "",
      "OUTPUT FORMAT:",
      "- Start with the --- frontmatter block on the very first line",
      "- Do NOT wrap in markdown code fences",
      "- Output raw markdown only",
      "",
      "AFTER GENERATING:",
      `Call the submit_book tool with: slug "${slug}", title "${entry.title}", author "${entry.author}", category "${entry.category}", and the full markdown content.`,
    ].join("\n"),
    existingSlugs: existingSlugs.map((s) => `[[${s}]]`),
    template,
    example,
  };
}
