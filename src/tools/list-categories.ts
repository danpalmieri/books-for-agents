import type { Book } from "../utils/markdown-parser.js";

export function listCategories(books: Book[]): object {
  const categories = new Map<string, { count: number; books: string[] }>();

  for (const book of books) {
    const cat = book.metadata.category;
    const entry = categories.get(cat) || { count: 0, books: [] };
    entry.count++;
    entry.books.push(book.metadata.title);
    categories.set(cat, entry);
  }

  return {
    categories: Array.from(categories.entries()).map(([name, data]) => ({
      name,
      bookCount: data.count,
      books: data.books,
    })),
    totalBooks: books.length,
    totalCategories: categories.size,
  };
}
