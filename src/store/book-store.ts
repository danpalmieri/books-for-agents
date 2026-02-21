import type { Book } from "../types.js";
import type { BacklogEntry } from "../tools/generate-book.js";

export interface SearchResult {
  book: Book;
  score: number;
}

export interface CategoryInfo {
  name: string;
  bookCount: number;
  books: string[];
}

export interface BookStore {
  search(query: string, category?: string, limit?: number): Promise<SearchResult[]>;
  getBySlug(slug: string): Promise<Book | undefined>;
  getByTitle(titleSubstring: string): Promise<Book | undefined>;
  getAllBooks(): Promise<Book[]>;
  getAllSlugs(): Promise<string[]>;
  getCategories(): Promise<CategoryInfo[]>;
  getBacklog(): Promise<BacklogEntry[]>;
  getTemplate(): Promise<string>;
  getExample(): Promise<string>;
  insertBook(book: Book): Promise<void>;
  insertBacklogEntry(entry: BacklogEntry): Promise<void>;
  updateBacklogStatus(title: string, status: string, contributor: string): Promise<boolean>;
}
