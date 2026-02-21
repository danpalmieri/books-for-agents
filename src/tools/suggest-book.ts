import type { BookStore } from "../store/book-store.js";

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
  const titleLower = input.title.toLowerCase().trim();

  // 1. Check published books
  const allBooks = await store.getAllBooks();
  const publishedMatch = allBooks.find(
    (b) => b.metadata.title.toLowerCase() === titleLower
  );
  if (publishedMatch) {
    return {
      error: `"${input.title}" already exists as a published book (slug: ${publishedMatch.metadata.slug}).`,
      suggestion: "Use get_book or search_books to read it.",
    };
  }

  // 2. Check backlog
  const backlog = await store.getBacklog();
  const backlogMatch = backlog.find(
    (b) => b.title.toLowerCase() === titleLower
  );
  if (backlogMatch) {
    return {
      error: `"${input.title}" is already in the backlog (status: ${backlogMatch.status}).`,
      suggestion: "Use list_backlog to see all backlog entries.",
    };
  }

  // 3. Insert into backlog
  await store.insertBacklogEntry({
    title: input.title,
    author: input.author,
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
