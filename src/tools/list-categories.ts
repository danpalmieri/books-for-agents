import type { BookStore } from "../store/book-store.js";

export async function listCategories(store: BookStore): Promise<object> {
  const categories = await store.getCategories();

  const totalBooks = categories.reduce((sum, c) => sum + c.bookCount, 0);

  return {
    categories: categories.map((c) => ({
      name: c.name,
      bookCount: c.bookCount,
      books: c.books,
    })),
    totalBooks,
    totalCategories: categories.length,
  };
}
