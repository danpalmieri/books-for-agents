import type { BookStore } from "../store/book-store.js";
import { validateSuggestion } from "../utils/validation.js";

export interface SuggestBookInput {
  title: string;
  author: string;
  category: string;
  year?: number;
  tags?: string[];
  isbn?: string;
  reason?: string;
}

export async function suggestBook(
  input: SuggestBookInput,
  store: BookStore
): Promise<object> {
  const titleLower = (input.title ?? "").toLowerCase().trim();

  // 1. Reject obvious test artifacts and malformed metadata before any lookup
  const errors = validateSuggestion(input);
  if (errors.length > 0) {
    return {
      error: `Suggestion rejected: it does not look like a real book (${errors.length} problem${errors.length > 1 ? "s" : ""}).`,
      problems: errors,
      suggestion:
        "Suggest a real, published book with its actual title, author and one of the supported categories.",
    };
  }

  // 2. Check published books
  const published = await store.getAllTitles();
  const publishedMatch = published.find(
    (b) => b.title.toLowerCase().trim() === titleLower
  );
  if (publishedMatch) {
    return {
      error: `"${input.title}" already exists as a published book (slug: ${publishedMatch.slug}).`,
      suggestion: "Use get_book or search_books to read it.",
    };
  }

  // 3. Check backlog
  const backlog = await store.getBacklog();
  const backlogMatch = backlog.find(
    (b) => b.title.toLowerCase().trim() === titleLower
  );
  if (backlogMatch) {
    return {
      error: `"${input.title}" is already in the backlog (status: ${backlogMatch.status}).`,
      suggestion: "Use list_backlog to see all backlog entries.",
    };
  }

  // 4. Insert into backlog
  await store.insertBacklogEntry({
    title: input.title.trim(),
    author: input.author.trim(),
    year: input.year ?? 0,
    category: input.category,
    tags: input.tags ?? [],
    isbn: input.isbn ?? "",
    status: "pending",
    contributor: null,
  });

  return {
    success: true,
    message: `"${input.title}" by ${input.author} added to the backlog. Use generate_book to create the summary.`,
  };
}
