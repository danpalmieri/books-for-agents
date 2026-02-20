import type { Book } from "./markdown-parser.js";

interface SearchResult {
  book: Book;
  score: number;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }
  // Normalize by document length
  for (const [term, count] of tf) {
    tf.set(term, count / tokens.length);
  }
  return tf;
}

export class SearchEngine {
  private books: Book[] = [];
  private documentTokens: Map<string, string[]> = new Map();
  private idf: Map<string, number> = new Map();

  index(books: Book[]): void {
    this.books = books;
    this.documentTokens.clear();
    this.idf.clear();

    const docFreq = new Map<string, number>();

    for (const book of books) {
      const text = [
        book.metadata.title,
        book.metadata.author,
        book.metadata.tags.join(" "),
        book.metadata.category,
        book.oneLiner,
        book.content,
      ].join(" ");

      const tokens = tokenize(text);
      this.documentTokens.set(book.metadata.slug, tokens);

      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        docFreq.set(token, (docFreq.get(token) || 0) + 1);
      }
    }

    // Compute IDF
    const N = books.length;
    for (const [term, df] of docFreq) {
      this.idf.set(term, Math.log((N + 1) / (df + 1)) + 1);
    }
  }

  search(query: string, category?: string, limit = 5): SearchResult[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const results: SearchResult[] = [];

    for (const book of this.books) {
      if (category && book.metadata.category !== category) continue;

      const docTokens = this.documentTokens.get(book.metadata.slug);
      if (!docTokens) continue;

      const tf = computeTF(docTokens);
      let score = 0;

      for (const qToken of queryTokens) {
        const termTF = tf.get(qToken) || 0;
        const termIDF = this.idf.get(qToken) || 0;
        score += termTF * termIDF;

        // Boost for title match
        if (tokenize(book.metadata.title).includes(qToken)) {
          score += 2;
        }

        // Boost for tag match
        const tagTokens = book.metadata.tags.flatMap((t) => tokenize(t));
        if (tagTokens.includes(qToken)) {
          score += 1.5;
        }

        // Boost for "when to use" match
        if (tokenize(book.sections.whenToUse).includes(qToken)) {
          score += 1;
        }
      }

      if (score > 0) {
        results.push({ book, score });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
