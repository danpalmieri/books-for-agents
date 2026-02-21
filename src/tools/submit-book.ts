import type { BookStore } from "../store/book-store.js";
import { parseBookFromContent } from "../utils/markdown-parser.js";

export interface SubmitBookInput {
  slug: string;
  title: string;
  author: string;
  category: string;
  content: string;
}

export async function submitBook(
  input: SubmitBookInput,
  store: BookStore
): Promise<object> {
  // Check for duplicate
  const existing = await store.getBySlug(input.slug);
  if (existing) {
    return {
      error: `A book with slug "${input.slug}" already exists.`,
      suggestion: "Pick a different book from the backlog using generate_book.",
    };
  }

  // Parse markdown content into a Book object
  const book = parseBookFromContent(input.content, input.slug);

  // Insert into D1
  await store.insertBook(book);

  // Mark backlog entry as done
  await store.updateBacklogStatus(input.title, "done", "mcp-agent");

  return {
    success: true,
    slug: input.slug,
    title: input.title,
    message: `Book "${input.title}" published directly to the knowledge base. It is now available via search_books and get_book.`,
  };
}
