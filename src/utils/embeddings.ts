import type { Book } from "../types.js";

export function buildEmbeddingText(book: Book): string {
  const parts = [
    book.metadata.title,
    book.oneLiner,
    book.metadata.tags.join(", "),
    book.sections.whenToUse,
  ];
  return parts.filter(Boolean).join(" | ");
}

export interface ScoredItem {
  id: string;
  score: number;
}

export function fuseScores(
  ftsResults: ScoredItem[],
  vectorResults: ScoredItem[],
  ftsWeight = 0.4,
  vectorWeight = 0.6
): ScoredItem[] {
  const maxFts = Math.max(...ftsResults.map((r) => Math.abs(r.score)), 1);
  const maxVec = Math.max(...vectorResults.map((r) => r.score), 1);

  const scoreMap = new Map<string, { fts: number; vec: number }>();

  for (const r of ftsResults) {
    scoreMap.set(r.id, { fts: Math.abs(r.score) / maxFts, vec: 0 });
  }
  for (const r of vectorResults) {
    const existing = scoreMap.get(r.id) ?? { fts: 0, vec: 0 };
    existing.vec = r.score / maxVec;
    scoreMap.set(r.id, existing);
  }

  return [...scoreMap.entries()]
    .map(([id, s]) => ({
      id,
      score: ftsWeight * s.fts + vectorWeight * s.vec,
    }))
    .sort((a, b) => b.score - a.score);
}
