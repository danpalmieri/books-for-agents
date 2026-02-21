-- Books table
CREATE TABLE books (
  slug                TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  author              TEXT NOT NULL,
  year                INTEGER NOT NULL,
  category            TEXT NOT NULL,
  tags                TEXT NOT NULL DEFAULT '[]',
  language            TEXT NOT NULL DEFAULT 'en',
  isbn                TEXT NOT NULL DEFAULT '',
  content             TEXT NOT NULL,
  one_liner           TEXT NOT NULL DEFAULT '',
  section_ideas       TEXT NOT NULL DEFAULT '',
  section_frameworks  TEXT NOT NULL DEFAULT '',
  section_quotes      TEXT NOT NULL DEFAULT '',
  section_connections TEXT NOT NULL DEFAULT '',
  section_when_to_use TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_books_category ON books(category);

-- FTS5 virtual table: column order matches bm25() weights
CREATE VIRTUAL TABLE books_fts USING fts5(
  title, content, tags, section_when_to_use,
  slug UNINDEXED,
  content='books', content_rowid='rowid'
);

-- Triggers for automatic FTS sync
CREATE TRIGGER books_ai AFTER INSERT ON books BEGIN
  INSERT INTO books_fts(rowid, title, content, tags, section_when_to_use, slug)
  VALUES (new.rowid, new.title, new.content, new.tags, new.section_when_to_use, new.slug);
END;

CREATE TRIGGER books_ad AFTER DELETE ON books BEGIN
  INSERT INTO books_fts(books_fts, rowid, title, content, tags, section_when_to_use, slug)
  VALUES ('delete', old.rowid, old.title, old.content, old.tags, old.section_when_to_use, old.slug);
END;

CREATE TRIGGER books_au AFTER UPDATE ON books BEGIN
  INSERT INTO books_fts(books_fts, rowid, title, content, tags, section_when_to_use, slug)
  VALUES ('delete', old.rowid, old.title, old.content, old.tags, old.section_when_to_use, old.slug);
  INSERT INTO books_fts(rowid, title, content, tags, section_when_to_use, slug)
  VALUES (new.rowid, new.title, new.content, new.tags, new.section_when_to_use, new.slug);
END;

-- Backlog table
CREATE TABLE backlog (
  title       TEXT NOT NULL,
  author      TEXT NOT NULL,
  year        INTEGER NOT NULL,
  category    TEXT NOT NULL,
  tags        TEXT NOT NULL DEFAULT '[]',
  isbn        TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'pending',
  contributor TEXT,
  UNIQUE(title, author)
);

-- Generation assets (template, example)
CREATE TABLE generation_assets (
  name    TEXT PRIMARY KEY,
  content TEXT NOT NULL
);
