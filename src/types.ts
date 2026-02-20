export interface BookMetadata {
  title: string;
  author: string;
  year: number;
  category: string;
  tags: string[];
  language: string;
  isbn: string;
  slug: string;
}

export interface Book {
  metadata: BookMetadata;
  content: string;
  oneLiner: string;
  sections: {
    ideas: string;
    frameworks: string;
    quotes: string;
    connections: string;
    whenToUse: string;
  };
}
