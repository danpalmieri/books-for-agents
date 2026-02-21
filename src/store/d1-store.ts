import type { Book, BookMetadata } from "../types.js";
import type { BacklogEntry } from "../tools/generate-book.js";
import type { BookStore, SearchResult, CategoryInfo } from "./book-store.js";
import { buildEmbeddingText, fuseScores } from "../utils/embeddings.js";
import type { ScoredItem } from "../utils/embeddings.js";

interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
}

interface D1Result<T> {
  results: T[];
  success: boolean;
}

interface Vectorize {
  query(
    vector: number[],
    options: { topK: number; filter?: Record<string, unknown>; returnMetadata?: boolean }
  ): Promise<{ matches: { id: string; score: number; metadata?: Record<string, unknown> }[] }>;
  upsert(
    vectors: { id: string; values: number[]; metadata?: Record<string, unknown> }[]
  ): Promise<unknown>;
}

interface Ai {
  run(
    model: string,
    input: { text: string[] }
  ): Promise<{ data: number[][] }>;
}

interface BookRow {
  slug: string;
  title: string;
  author: string;
  year: number;
  category: string;
  tags: string;
  language: string;
  isbn: string;
  content: string;
  one_liner: string;
  section_ideas: string;
  section_frameworks: string;
  section_quotes: string;
  section_connections: string;
  section_when_to_use: string;
}

interface BacklogRow {
  title: string;
  author: string;
  year: number;
  category: string;
  tags: string;
  isbn: string;
  status: string;
  contributor: string | null;
}

function rowToBook(row: BookRow): Book {
  let tags: string[];
  try {
    tags = JSON.parse(row.tags);
  } catch {
    tags = [];
  }

  const metadata: BookMetadata = {
    title: row.title,
    author: row.author,
    year: row.year,
    category: row.category,
    tags,
    language: row.language,
    isbn: row.isbn,
    slug: row.slug,
  };

  return {
    metadata,
    content: row.content,
    oneLiner: row.one_liner,
    sections: {
      ideas: row.section_ideas,
      frameworks: row.section_frameworks,
      quotes: row.section_quotes,
      connections: row.section_connections,
      whenToUse: row.section_when_to_use,
    },
  };
}

function sanitizeFtsQuery(query: string): string {
  // Remove FTS5 special characters, split into words, join with OR
  const words = query
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
  if (words.length === 0) return "";
  return words.map((w) => `"${w}"`).join(" OR ");
}

export class D1BookStore implements BookStore {
  private db: D1Database;
  private vectorize: Vectorize | null;
  private ai: Ai | null;

  constructor(db: D1Database, vectorize?: Vectorize, ai?: Ai) {
    this.db = db;
    this.vectorize = vectorize ?? null;
    this.ai = ai ?? null;
  }

  async search(query: string, category?: string, limit?: number): Promise<SearchResult[]> {
    const maxResults = limit ?? 5;
    const poolSize = 20;

    const ftsPromise = this.ftsSearch(query, category, poolSize);

    let vectorPromise: Promise<ScoredItem[]>;
    if (this.vectorize && this.ai) {
      vectorPromise = this.vectorSearch(query, category, poolSize);
    } else {
      vectorPromise = Promise.resolve([]);
    }

    const [ftsResults, vectorResults] = await Promise.all([ftsPromise, vectorPromise]);

    // If no Vectorize available, return FTS results directly
    if (vectorResults.length === 0) {
      return ftsResults.slice(0, maxResults);
    }

    // Fuse scores
    const ftsScored = ftsResults.map((r) => ({
      id: r.book.metadata.slug,
      score: r.score,
    }));
    const fused = fuseScores(ftsScored, vectorResults);

    // Resolve books for IDs that came only from vector search
    const ftsMap = new Map(ftsResults.map((r) => [r.book.metadata.slug, r.book]));
    const missingIds = fused
      .filter((f) => !ftsMap.has(f.id))
      .map((f) => f.id)
      .slice(0, maxResults);

    if (missingIds.length > 0) {
      const placeholders = missingIds.map(() => "?").join(",");
      const { results } = await this.db
        .prepare(`SELECT * FROM books WHERE slug IN (${placeholders})`)
        .bind(...missingIds)
        .all<BookRow>();
      for (const row of results) {
        ftsMap.set(row.slug, rowToBook(row));
      }
    }

    return fused
      .slice(0, maxResults)
      .filter((f) => ftsMap.has(f.id))
      .map((f) => ({ book: ftsMap.get(f.id)!, score: f.score }));
  }

  private async ftsSearch(
    query: string,
    category: string | undefined,
    limit: number
  ): Promise<SearchResult[]> {
    const ftsQuery = sanitizeFtsQuery(query);
    if (!ftsQuery) return [];

    let sql: string;
    const params: unknown[] = [ftsQuery];

    if (category) {
      sql = `
        SELECT b.*, bm25(books_fts, 10.0, 1.0, 5.0, 3.0) AS rank
        FROM books_fts
        JOIN books b ON books_fts.rowid = b.rowid
        WHERE books_fts MATCH ?
          AND b.category = ?
        ORDER BY rank
        LIMIT ?
      `;
      params.push(category, limit);
    } else {
      sql = `
        SELECT b.*, bm25(books_fts, 10.0, 1.0, 5.0, 3.0) AS rank
        FROM books_fts
        JOIN books b ON books_fts.rowid = b.rowid
        WHERE books_fts MATCH ?
        ORDER BY rank
        LIMIT ?
      `;
      params.push(limit);
    }

    const { results } = await this.db
      .prepare(sql)
      .bind(...params)
      .all<BookRow & { rank: number }>();

    return results.map((row) => ({
      book: rowToBook(row),
      score: Math.abs(row.rank),
    }));
  }

  private async vectorSearch(
    query: string,
    category: string | undefined,
    limit: number
  ): Promise<ScoredItem[]> {
    if (!this.vectorize || !this.ai) return [];

    const resp = await this.ai.run("@cf/baai/bge-base-en-v1.5", {
      text: [query],
    });

    const queryVector = resp.data[0];
    const filter = category ? { category } : undefined;

    const vectorResults = await this.vectorize.query(queryVector, {
      topK: limit,
      filter,
      returnMetadata: true,
    });

    return vectorResults.matches.map((m) => ({
      id: m.id,
      score: m.score,
    }));
  }

  async reindexVectors(): Promise<{ indexed: number }> {
    if (!this.vectorize || !this.ai) {
      throw new Error("Vectorize/AI bindings not available");
    }

    const { results } = await this.db
      .prepare("SELECT * FROM books")
      .all<BookRow>();
    const books = results.map(rowToBook);

    // Batch of 100 (Workers AI limit)
    for (let i = 0; i < books.length; i += 100) {
      const batch = books.slice(i, i + 100);
      const texts = batch.map(buildEmbeddingText);

      const resp = await this.ai.run("@cf/baai/bge-base-en-v1.5", {
        text: texts,
      });

      const vectors = batch.map((book, idx) => ({
        id: book.metadata.slug,
        values: resp.data[idx],
        metadata: {
          title: book.metadata.title,
          category: book.metadata.category,
        },
      }));

      await this.vectorize.upsert(vectors);
    }

    return { indexed: books.length };
  }

  async getBySlug(slug: string): Promise<Book | undefined> {
    const row = await this.db
      .prepare("SELECT * FROM books WHERE slug = ?")
      .bind(slug)
      .first<BookRow>();
    return row ? rowToBook(row) : undefined;
  }

  async getByTitle(titleSubstring: string): Promise<Book | undefined> {
    const pattern = `%${titleSubstring.toLowerCase()}%`;
    const row = await this.db
      .prepare("SELECT * FROM books WHERE LOWER(title) LIKE ?")
      .bind(pattern)
      .first<BookRow>();
    return row ? rowToBook(row) : undefined;
  }

  async getAllBooks(): Promise<Book[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM books ORDER BY title")
      .all<BookRow>();
    return results.map(rowToBook);
  }

  async getAllSlugs(): Promise<string[]> {
    const { results } = await this.db
      .prepare("SELECT slug FROM books ORDER BY slug")
      .all<{ slug: string }>();
    return results.map((r) => r.slug);
  }

  async getCategories(): Promise<CategoryInfo[]> {
    const { results } = await this.db
      .prepare("SELECT category, title FROM books ORDER BY category, title")
      .all<{ category: string; title: string }>();

    const map = new Map<string, string[]>();
    for (const row of results) {
      const list = map.get(row.category) || [];
      list.push(row.title);
      map.set(row.category, list);
    }

    return Array.from(map.entries()).map(([name, books]) => ({
      name,
      bookCount: books.length,
      books,
    }));
  }

  async getBacklog(): Promise<BacklogEntry[]> {
    const { results } = await this.db
      .prepare("SELECT * FROM backlog ORDER BY rowid")
      .all<BacklogRow>();

    return results.map((row) => {
      let tags: string[];
      try {
        tags = JSON.parse(row.tags);
      } catch {
        tags = [];
      }
      return {
        title: row.title,
        author: row.author,
        year: row.year,
        category: row.category,
        tags,
        isbn: row.isbn,
        status: row.status as BacklogEntry["status"],
        contributor: row.contributor,
      };
    });
  }

  async getTemplate(): Promise<string> {
    const row = await this.db
      .prepare("SELECT content FROM generation_assets WHERE name = ?")
      .bind("template")
      .first<{ content: string }>();
    return row?.content ?? "";
  }

  async getExample(): Promise<string> {
    const row = await this.db
      .prepare("SELECT content FROM generation_assets WHERE name = ?")
      .bind("example")
      .first<{ content: string }>();
    return row?.content ?? "";
  }

  async insertBook(book: Book): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO books (slug, title, author, year, category, tags, language, isbn, content, one_liner, section_ideas, section_frameworks, section_quotes, section_connections, section_when_to_use)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        book.metadata.slug,
        book.metadata.title,
        book.metadata.author,
        book.metadata.year,
        book.metadata.category,
        JSON.stringify(book.metadata.tags),
        book.metadata.language,
        book.metadata.isbn,
        book.content,
        book.oneLiner,
        book.sections.ideas,
        book.sections.frameworks,
        book.sections.quotes,
        book.sections.connections,
        book.sections.whenToUse
      )
      .all();

    // Generate embedding and upsert to Vectorize
    if (this.vectorize && this.ai) {
      const text = buildEmbeddingText(book);
      const resp = await this.ai.run("@cf/baai/bge-base-en-v1.5", {
        text: [text],
      });
      await this.vectorize.upsert([
        {
          id: book.metadata.slug,
          values: resp.data[0],
          metadata: {
            title: book.metadata.title,
            category: book.metadata.category,
          },
        },
      ]);
    }
  }

  async insertBacklogEntry(entry: BacklogEntry): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO backlog (title, author, year, category, tags, isbn, status, contributor)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        entry.title,
        entry.author,
        entry.year,
        entry.category,
        JSON.stringify(entry.tags),
        entry.isbn,
        entry.status,
        entry.contributor
      )
      .all();
  }

  async updateBacklogStatus(title: string, status: string, contributor: string): Promise<boolean> {
    const result = await this.db
      .prepare("UPDATE backlog SET status = ?, contributor = ? WHERE title = ?")
      .bind(status, contributor, title)
      .all();
    return result.success;
  }
}
