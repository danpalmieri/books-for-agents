import type { BookStore } from "../store/book-store.js";

export interface ListBooksByAuthorInput {
  author: string;
}

export async function listBooksByAuthor(store: BookStore, input: ListBooksByAuthorInput): Promise<object> {
  const books = await store.getByAuthor(input.author);
  if (books.length === 0) {
    const allBooks = await store.getAllBooks();
    const authors = [...new Set(allBooks.map((b) => b.metadata.author))].sort();
    return { error: `No books found for author matching "${input.author}"`, availableAuthors: authors };
  }
  return {
    author: books[0].metadata.author,
    books: books.map((b) => ({
      title: b.metadata.title,
      slug: b.metadata.slug,
      category: b.metadata.category,
      year: b.metadata.year,
      oneLiner: b.oneLiner,
    })),
    total: books.length,
  };
}
