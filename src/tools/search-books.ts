import type { BookStore } from "../store/book-store.js";

export interface SearchBooksInput {
  query: string;
  category?: string;
  limit?: number;
}

export async function searchBooks(
  store: BookStore,
  input: SearchBooksInput
): Promise<object> {
  const results = await store.search(input.query, input.category, input.limit || 5);

  return {
    results: results.map((r) => ({
      title: r.book.metadata.title,
      author: r.book.metadata.author,
      slug: r.book.metadata.slug,
      category: r.book.metadata.category,
      oneLiner: r.book.oneLiner,
      tags: r.book.metadata.tags,
      relevanceScore: Math.round(r.score * 100) / 100,
    })),
    total: results.length,
  };
}
