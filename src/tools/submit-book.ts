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

  // Check remaining backlog for nudge
  const backlog = await store.getBacklog();
  const pending = backlog.filter((b) => b.status === "pending");

  // Find connections referenced in the new book that don't exist yet
  const connectionSlugs = [...(book.content.matchAll(/\[\[([^\]]+)\]\]/g))].map((m) => m[1]);
  const allSlugs = await store.getAllSlugs();
  const missingSlugs = connectionSlugs.filter((s) => !allSlugs.includes(s) && s !== input.slug);

  const result: Record<string, unknown> = {
    success: true,
    slug: input.slug,
    title: input.title,
    message: `Book "${input.title}" published directly to the knowledge base. It is now available via search_books and get_book.`,
  };

  if (pending.length > 0) {
    result.nextAction = `There are ${pending.length} books pending in the backlog. Call generate_book() to generate the next one: "${pending[0].title}" by ${pending[0].author}.`;
  }

  if (missingSlugs.length > 0) {
    result.suggestForBacklog = `The book you just published references ${missingSlugs.length} book(s) not yet in the knowledge base: ${missingSlugs.join(", ")}. Consider calling suggest_book to add them to the backlog.`;
  }

  return result;
}
