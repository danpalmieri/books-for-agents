import type { Book } from "../types.js";
import type { BacklogEntry } from "./generate-book.js";

export interface SuggestBookInput {
  title: string;
  author: string;
  category: string;
  year?: number;
  tags?: string[];
  isbn?: string;
  reason?: string;
}

const REPO = "danpalmieri/books-for-agents";

export async function fetchExistingSuggestionTitles(
  githubToken: string
): Promise<string[]> {
  if (!githubToken) return [];

  const url = `https://api.github.com/repos/${REPO}/issues?labels=book-suggestion&state=all&per_page=100`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "books-for-agents-mcp",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!response.ok) return [];

  const issues = (await response.json()) as { title: string }[];
  return issues.map((i) => i.title);
}

export async function suggestBook(
  input: SuggestBookInput,
  books: Book[],
  backlog: BacklogEntry[],
  githubToken: string
): Promise<object> {
  const titleLower = input.title.toLowerCase().trim();

  // 1. Check published books
  const publishedMatch = books.find(
    (b) => b.metadata.title.toLowerCase() === titleLower
  );
  if (publishedMatch) {
    return {
      error: `"${input.title}" already exists as a published book (slug: ${publishedMatch.metadata.slug}).`,
      suggestion: "Use get_book or search_books to read it.",
    };
  }

  // 2. Check backlog
  const backlogMatch = backlog.find(
    (b) => b.title.toLowerCase() === titleLower
  );
  if (backlogMatch) {
    return {
      error: `"${input.title}" is already in the backlog (status: ${backlogMatch.status}).`,
      suggestion: "Use list_backlog to see all backlog entries.",
    };
  }

  // 3. Check existing GitHub Issues
  if (githubToken) {
    const existingTitles = await fetchExistingSuggestionTitles(githubToken);
    const issueTitle = `Suggest: ${input.title} — ${input.author}`;
    if (existingTitles.some((t) => t === issueTitle)) {
      return {
        error: `A suggestion for "${input.title}" already exists as a GitHub Issue.`,
        suggestion: "Pick a different book to suggest.",
      };
    }
  }

  // Build YAML block for the issue body
  const yearValue = input.year ?? "FILL_IN";
  const tagsValue = input.tags ? JSON.stringify(input.tags) : '["FILL_IN"]';
  const isbnValue = input.isbn ?? "FILL_IN";
  const reasonText = input.reason ?? "No reason provided.";

  const issueBody = [
    `## Book Suggestion`,
    "",
    `**Title:** ${input.title}`,
    `**Author:** ${input.author}`,
    `**Category:** ${input.category}`,
    `**Year:** ${yearValue}`,
    `**ISBN:** ${isbnValue}`,
    `**Tags:** ${input.tags ? input.tags.join(", ") : "FILL_IN"}`,
    "",
    `### Why this book?`,
    "",
    reasonText,
    "",
    "---",
    "",
    "```yaml",
    `- title: "${input.title}"`,
    `  author: "${input.author}"`,
    `  year: ${yearValue}`,
    `  category: "${input.category}"`,
    `  tags: ${tagsValue}`,
    `  isbn: "${isbnValue}"`,
    `  status: pending`,
    `  contributor: null`,
    "```",
    "",
    "---",
    "*This suggestion was submitted via the `suggest_book` MCP tool.*",
  ].join("\n");

  if (!githubToken) {
    return {
      error: "GitHub token not configured on this server. The suggestion was not submitted.",
      fallback:
        "Open an issue manually at https://github.com/danpalmieri/books-for-agents/issues/new " +
        'with the title "Suggest: ' +
        input.title +
        " — " +
        input.author +
        '" and labels "book-suggestion" and "' +
        input.category +
        '".',
      issueBody,
    };
  }

  const issueTitle = `Suggest: ${input.title} — ${input.author}`;

  const response = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "books-for-agents-mcp",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      title: issueTitle,
      body: issueBody,
      labels: ["book-suggestion", input.category],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      error: `GitHub API error (${response.status}): ${errorText}`,
      fallback: "Open an issue manually with the suggestion details.",
    };
  }

  const issue = (await response.json()) as { html_url: string; number: number };

  return {
    success: true,
    issueUrl: issue.html_url,
    issueNumber: issue.number,
    message: `Book suggestion submitted as issue #${issue.number}. A maintainer will review and add it to the backlog. Thank you!`,
  };
}
