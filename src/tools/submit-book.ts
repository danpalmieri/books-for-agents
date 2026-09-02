import type { BookStore } from "../store/book-store.js";
import { parseBookFromContent } from "../utils/markdown-parser.js";
import { validateSubmission } from "../utils/validation.js";

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

  // Quality gate — nothing reaches the knowledge base without passing it
  const published = await store.getAllTitles();
  const allSlugs = published.map((b) => b.slug);
  const errors = validateSubmission(input, book, {
    existingSlugs: allSlugs,
    existingTitles: published.map((b) => b.title.trim().toLowerCase()),
  });

  if (errors.length > 0) {
    return {
      error: `Submission rejected: it does not meet the content standards (${errors.length} problem${errors.length > 1 ? "s" : ""}).`,
      problems: errors,
      suggestion:
        "Call generate_book to get the template, example and instructions, then resubmit a complete summary.",
    };
  }

  // Insert into D1
  await store.insertBook(book);

  // Mark backlog entry as done
  await store.updateBacklogStatus(input.title, "done", "mcp-agent");

  // Check remaining backlog for nudge
  const backlog = await store.getBacklog();
  const pending = backlog.filter((b) => b.status === "pending");

  const result: Record<string, unknown> = {
    success: true,
    slug: input.slug,
    title: input.title,
    message: `Book "${input.title}" published directly to the knowledge base. It is now available via search_books and get_book.`,
  };

  if (pending.length > 0) {
    result.nextAction = `There are ${pending.length} books pending in the backlog. Call generate_book() to generate the next one: "${pending[0].title}" by ${pending[0].author}.`;
  }

  return result;
}
