/**
 * Server-side gates for the write tools (`submit_book`, `suggest_book`).
 *
 * Two independent layers:
 *  1. A structural quality gate — a summary must actually look like a summary
 *     (valid slug, complete frontmatter, five populated sections, real
 *     cross-references). This is what stops the bulk of automated junk.
 *  2. A name heuristic — catches entries that are structurally plausible but
 *     obviously synthetic ("A Very Unique Test Book XYZ123" by "Test Author").
 *     Deliberately conservative: real titles containing "test" (Test Driven
 *     Development, The Mom Test) must pass.
 */

import type { Book } from "../types.js";

export const VALID_CATEGORIES = [
  "business",
  "psychology",
  "technology",
  "self-improvement",
] as const;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Placeholder tokens no real book title contains. Any single hit rejects. */
const MASH_TOKEN = /^(?:xyz|abc|pdq|qux|foo|asdf|qwerty|zzz+|lorem|ipsum|boogaloo)+\d*$/;
const MASH_NUMBER = /^(?:123|321|999+|987|000|12345|123456|\d{6,})$/;

/** Vocabulary of automated testing. Two hits, or one plus filler, rejects. */
const TEST_TOKENS = new Set([
  "test", "tests", "testing", "tester",
  "verification", "verify", "verified", "verifying",
  "dummy", "fake", "mock", "placeholder", "sample", "probe",
  "debug", "sandbox", "scratch", "submit", "submission",
]);

/** Padding words that generated test names lean on. Three hits rejects. */
const FILLER_TOKENS = new Set([
  "unique", "totally", "truly", "obscure", "minimal",
  "edge", "agent", "tool", "functional", "novel", "very",
]);

/** Author fields that are never a real person or imprint. */
const FAKE_AUTHOR = /\b(?:author|test|tests|testing|tester|verification|verify|dummy|fake|mock|placeholder|anonymous|unknown|jane doe|john doe|foo bar|n\/?a)\b/i;

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/**
 * Returns the reason the text looks like a test artifact, or null if it passes.
 */
export function testArtifactReason(text: string): string | null {
  const tokens = tokenize(text);
  if (tokens.length === 0) return null;

  for (const token of tokens) {
    if (MASH_TOKEN.test(token)) return `contains the placeholder token "${token}"`;
    if (MASH_NUMBER.test(token)) return `contains the filler number "${token}"`;
  }

  const testHits = tokens.filter((t) => TEST_TOKENS.has(t));
  const fillerHits = tokens.filter((t) => FILLER_TOKENS.has(t));

  if (testHits.length >= 2) {
    return `reads as a test fixture (${testHits.join(", ")})`;
  }
  if (testHits.length >= 1 && fillerHits.length >= 1) {
    return `reads as a test fixture (${[...testHits, ...fillerHits].join(", ")})`;
  }
  if (fillerHits.length >= 3) {
    return `reads as generated filler (${fillerHits.join(", ")})`;
  }
  return null;
}

/** Shared checks over the title/author/category triple. */
function validateIdentity(
  input: { title: string; author: string; category: string; year?: number },
  errors: string[]
): void {
  const title = (input.title ?? "").trim();
  const author = (input.author ?? "").trim();

  if (title.length < 2) {
    errors.push("title is required.");
  } else {
    const reason = testArtifactReason(title);
    if (reason) errors.push(`title "${title}" ${reason}.`);
  }

  if (author.length < 2) {
    errors.push("author is required.");
  } else if (FAKE_AUTHOR.test(author)) {
    errors.push(`author "${author}" is a placeholder, not a real author.`);
  } else {
    const reason = testArtifactReason(author);
    if (reason) errors.push(`author "${author}" ${reason}.`);
  }

  if (!VALID_CATEGORIES.includes(input.category as (typeof VALID_CATEGORIES)[number])) {
    errors.push(
      `category "${input.category}" is not valid. Use one of: ${VALID_CATEGORIES.join(", ")}.`
    );
  }

  if (input.year !== undefined && input.year !== 0) {
    const maxYear = new Date().getFullYear() + 1;
    if (!Number.isInteger(input.year) || input.year < -500 || input.year > maxYear) {
      errors.push(`year ${input.year} is not a plausible publication year.`);
    }
  }
}

export function validateSuggestion(input: {
  title: string;
  author: string;
  category: string;
  year?: number;
}): string[] {
  const errors: string[] = [];
  validateIdentity(input, errors);
  return errors;
}

/** Minimum characters per section, sized well below the smallest real summary. */
const MIN_SECTION_LENGTH = {
  ideas: 600,
  frameworks: 200,
  quotes: 150,
  connections: 150,
  whenToUse: 150,
} as const;

const MIN_CONTENT_LENGTH = 2500;
const MIN_ONE_LINER_LENGTH = 40;

const SECTION_LABELS: Record<keyof typeof MIN_SECTION_LENGTH, string> = {
  ideas: "Key Ideas",
  frameworks: "Frameworks and Models",
  quotes: "Key Quotes",
  connections: "Connections with Other Books",
  whenToUse: "When to Use This Knowledge",
};

export interface SubmissionContext {
  /** Slugs already published, used to validate `[[slug]]` cross-references. */
  existingSlugs: string[];
  /** Lowercased titles already published, used to catch near-duplicate spam. */
  existingTitles: string[];
}

export function validateSubmission(
  input: { slug: string; title: string; author: string; category: string },
  book: Book,
  ctx: SubmissionContext
): string[] {
  const errors: string[] = [];
  const slug = (input.slug ?? "").trim();

  if (!SLUG_PATTERN.test(slug)) {
    errors.push(
      `slug "${slug}" is malformed. Use lowercase words separated by single hyphens (e.g. the-power-of-habit).`
    );
  } else if (slug.length > 120) {
    errors.push(`slug "${slug}" is too long (max 120 characters).`);
  } else {
    const reason = testArtifactReason(slug);
    if (reason) errors.push(`slug "${slug}" ${reason}.`);
  }

  // The frontmatter is the record that gets stored, so validate that — not
  // just the tool arguments, which can disagree with it.
  validateIdentity(
    {
      title: book.metadata.title || input.title,
      author: book.metadata.author || input.author,
      category: book.metadata.category || input.category,
      year: book.metadata.year,
    },
    errors
  );

  const title = (book.metadata.title || input.title || "").trim().toLowerCase();
  if (title && ctx.existingTitles.includes(title)) {
    errors.push(
      `a book titled "${book.metadata.title || input.title}" is already published. Use get_book to read it instead of submitting a duplicate.`
    );
  }

  if (book.content.length < MIN_CONTENT_LENGTH) {
    errors.push(
      `content is only ${book.content.length} characters. A complete summary needs at least ${MIN_CONTENT_LENGTH}.`
    );
  }

  if (book.oneLiner.length < MIN_ONE_LINER_LENGTH) {
    errors.push(
      'missing a one-sentence summary. Add a `> **One-sentence summary:** ...` line near the top.'
    );
  }

  for (const key of Object.keys(MIN_SECTION_LENGTH) as (keyof typeof MIN_SECTION_LENGTH)[]) {
    const section = book.sections[key];
    if (!section) {
      errors.push(`missing the "## ${SECTION_LABELS[key]}" section.`);
    } else if (section.length < MIN_SECTION_LENGTH[key]) {
      errors.push(
        `section "${SECTION_LABELS[key]}" is only ${section.length} characters; it needs at least ${MIN_SECTION_LENGTH[key]}.`
      );
    }
  }

  if (!/\*\*(?:Practical application|Aplicação prática):\*\*/.test(book.content)) {
    errors.push('no "**Practical application:**" found. Each key idea needs one.');
  }

  const referenced = [...new Set([...book.content.matchAll(/\[\[([^\]]+)\]\]/g)].map((m) => m[1]))];
  const unknown = referenced.filter((s) => s !== slug && !ctx.existingSlugs.includes(s));
  if (unknown.length > 0) {
    errors.push(
      `cross-references point to books that do not exist: ${unknown.join(", ")}. Only use slugs returned by generate_book, and call suggest_book to queue the missing ones.`
    );
  }

  return errors;
}
