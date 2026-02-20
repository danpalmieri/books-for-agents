import type { Book } from "../utils/markdown-parser.js";

export interface GetBookInput {
  slug?: string;
  title?: string;
}

export interface GetBookSectionInput {
  slug: string;
  section: "ideias" | "frameworks" | "citacoes" | "conexoes" | "quando-usar";
}

const sectionMap: Record<string, keyof Book["sections"]> = {
  ideias: "ideas",
  frameworks: "frameworks",
  citacoes: "quotes",
  conexoes: "connections",
  "quando-usar": "whenToUse",
};

export function getBook(books: Book[], input: GetBookInput): object {
  let book: Book | undefined;

  if (input.slug) {
    book = books.find((b) => b.metadata.slug === input.slug);
  } else if (input.title) {
    const titleLower = input.title.toLowerCase();
    book = books.find((b) => b.metadata.title.toLowerCase().includes(titleLower));
  }

  if (!book) {
    return { error: "Book not found", availableSlugs: books.map((b) => b.metadata.slug) };
  }

  return {
    metadata: book.metadata,
    oneLiner: book.oneLiner,
    content: book.content,
  };
}

export function getBookSection(
  books: Book[],
  input: GetBookSectionInput
): object {
  const book = books.find((b) => b.metadata.slug === input.slug);
  if (!book) {
    return { error: "Book not found", availableSlugs: books.map((b) => b.metadata.slug) };
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
