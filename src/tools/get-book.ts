import type { BookStore } from "../store/book-store.js";
import type { Book } from "../types.js";

export interface GetBookInput {
  slug?: string;
  title?: string;
}

export interface GetBookSectionInput {
  slug: string;
  section: "ideas" | "frameworks" | "quotes" | "connections" | "when-to-use";
}

const sectionMap: Record<string, keyof Book["sections"]> = {
  ideas: "ideas",
  frameworks: "frameworks",
  quotes: "quotes",
  connections: "connections",
  "when-to-use": "whenToUse",
};

export async function getBook(store: BookStore, input: GetBookInput): Promise<object> {
  let book: Book | undefined;

  if (input.slug) {
    book = await store.getBySlug(input.slug);
  } else if (input.title) {
    book = await store.getByTitle(input.title);
  }

  if (!book) {
    const slugs = await store.getAllSlugs();
    return { error: "Book not found", availableSlugs: slugs };
  }

  return {
    metadata: book.metadata,
    oneLiner: book.oneLiner,
    content: book.content,
  };
}

export async function getBookSection(
  store: BookStore,
  input: GetBookSectionInput
): Promise<object> {
  const book = await store.getBySlug(input.slug);
  if (!book) {
    const slugs = await store.getAllSlugs();
    return { error: "Book not found", availableSlugs: slugs };
  }

  const sectionKey = sectionMap[input.section];
  if (!sectionKey) {
    return {
      error: "Invalid section",
      validSections: Object.keys(sectionMap),
    };
  }

  return {
    title: book.metadata.title,
    section: input.section,
    content: book.sections[sectionKey],
  };
}
