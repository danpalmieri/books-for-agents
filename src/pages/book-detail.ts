import { marked } from "marked";
import type { Book } from "../types.js";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function categoryColor(category: string): string {
  switch (category) {
    case "business": return "#f0a050";
    case "psychology": return "#ce93d8";
    case "technology": return "#7cacf8";
    case "self-improvement": return "#00d4aa";
    default: return "#00d4aa";
  }
}

function renderMarkdown(md: string): string {
  // Convert [[slug]] wiki-links to anchor tags
  const processed = md.replace(/\[\[([a-z0-9-]+)\]\]/g, '<a href="/books/$1">$1</a>');
  return marked.parse(processed, { async: false }) as string;
}

export function renderBookPage(book: Book, baseUrl: string): string {
  const m = book.metadata;
  const url = `${baseUrl}/books/${m.slug}`;
  const description = escapeHtml(book.oneLiner);
  const title = escapeHtml(m.title);
  const author = escapeHtml(m.author);
  const catColor = categoryColor(m.category);
  const rawMdEscaped = escapeHtml(book.content);

  // Render the full markdown content (strip the # Title since we show it in the header)
  const contentWithoutTitle = book.content.replace(/^# .+\n*/, "");
  const contentHtml = renderMarkdown(contentWithoutTitle);

  const tagsHtml = m.tags.length > 0
    ? m.tags.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join(" ")
    : "";

  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Book",
    name: m.title,
    author: { "@type": "Person", name: m.author },
    datePublished: String(m.year),
    isbn: m.isbn || undefined,
    genre: m.category,
    url,
    description: book.oneLiner,
  });

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} by ${author} — Books for Agents</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${url}">

  <!-- OG -->
  <meta property="og:title" content="${title} — Books for Agents">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${baseUrl}/og.png">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title} — Books for Agents">
  <meta name="twitter:description" content="${description}">

  <!-- Favicon -->
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📚</text></svg>">

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">

  <!-- JSON-LD -->
  <script type="application/ld+json">${jsonLd}</script>

  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: #0a0a0a;
      --bg-surface: #111113;
      --bg-elevated: #18181b;
      --border: #222225;
      --border-light: #2a2a2e;
      --text: #e5e5e7;
      --text-secondary: #8a8a8e;
      --text-muted: #555558;
      --accent: #00d4aa;
      --accent-dim: #00d4aa22;
      --accent-glow: #00d4aa33;
      --accent-hover: #00f0c0;
      --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: "JetBrains Mono", "Fira Code", monospace;
    }

    html { scroll-behavior: smooth; }
    body {
      font-family: var(--font-sans);
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    a { color: var(--accent); text-decoration: none; transition: color 0.2s; }
    a:hover { color: var(--accent-hover); }

    .container { max-width: 800px; margin: 0 auto; padding: 0 24px; }

    /* Breadcrumb */
    .breadcrumb {
      padding: 20px 0;
      font-size: 14px;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border);
    }
    .breadcrumb a { color: var(--text-secondary); }

    /* Book header */
    .book-header {
      padding: 48px 0 32px;
      border-bottom: 1px solid var(--border);
    }
    .book-meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
      font-size: 14px;
      color: var(--text-secondary);
    }
    .book-category {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      border: 1px solid ${catColor}33;
      color: ${catColor};
      background: ${catColor}11;
    }
    .book-header h1 {
      font-size: clamp(28px, 5vw, 40px);
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.02em;
      margin-bottom: 8px;
    }
    .book-author {
      font-size: 18px;
      color: var(--text-secondary);
      margin-bottom: 20px;
    }
    .one-liner {
      font-size: 17px;
      color: var(--accent);
      font-weight: 500;
      line-height: 1.5;
      padding: 16px 20px;
      background: var(--accent-dim);
      border-radius: 10px;
      border-left: 3px solid var(--accent);
    }
    .tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    .tag {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 12px;
      color: var(--text-secondary);
      border: 1px solid var(--border);
      background: var(--bg-elevated);
    }

    /* Book content — matches modal-body styles */
    .book-content {
      padding: 40px 0 80px;
      font-size: 15px;
      line-height: 1.8;
      color: var(--text-secondary);
    }
    .book-content h1 { font-size: 22px; font-weight: 700; color: var(--text); margin: 32px 0 12px; }
    .book-content h2 { font-size: 20px; font-weight: 600; color: var(--accent); margin: 40px 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
    .book-content h3 { font-size: 16px; font-weight: 600; color: var(--text); margin: 24px 0 8px; }
    .book-content p { margin: 10px 0; }
    .book-content blockquote { border-left: 3px solid var(--accent-dim); padding-left: 16px; color: var(--text-muted); margin: 16px 0; }
    .book-content strong { color: var(--text); font-weight: 600; }
    .book-content table { border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px; }
    .book-content th, .book-content td { border: 1px solid var(--border); padding: 10px 14px; text-align: left; }
    .book-content th { background: var(--bg-elevated); color: var(--text); font-weight: 600; }
    .book-content code { background: var(--bg-elevated); padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: var(--font-mono); }
    .book-content pre { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 8px; padding: 16px; overflow-x: auto; margin: 16px 0; }
    .book-content pre code { background: none; padding: 0; }
    .book-content ul, .book-content ol { padding-left: 24px; margin: 10px 0; }
    .book-content li { margin: 6px 0; }
    .book-content a { color: var(--accent); }
    .book-content a:hover { color: var(--accent-hover); }

    /* Footer */
    footer {
      border-top: 1px solid var(--border);
      padding: 48px 0;
    }
    .footer-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }
    .footer-brand {
      font-weight: 600;
      font-size: 14px;
      color: var(--text);
    }
    .footer-links { display: flex; gap: 24px; }
    .footer-links a { font-size: 13px; color: var(--text-secondary); }

    /* View Markdown button */
    .btn-view-md {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 16px;
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      background: var(--bg-elevated);
      color: var(--text);
      border: 1px solid var(--border-light);
      transition: all 0.2s;
    }
    .btn-view-md:hover {
      border-color: var(--text-muted);
      background: var(--bg-surface);
    }

    /* Markdown modal */
    .md-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.75);
      z-index: 1000;
      justify-content: center;
      align-items: center;
      padding: 24px;
      backdrop-filter: blur(4px);
    }
    .md-overlay.open { display: flex; }
    .md-modal {
      background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      max-width: 800px;
      width: 100%;
      max-height: 85vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 30px 80px rgba(0,0,0,0.5);
    }
    .md-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .md-modal-header span { font-size: 15px; font-weight: 600; }
    .md-modal-actions { display: flex; gap: 8px; }
    .md-btn-copy, .md-btn-close {
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid var(--border);
      background: var(--bg-elevated);
      color: var(--text-secondary);
      transition: all 0.2s;
    }
    .md-btn-copy:hover, .md-btn-close:hover {
      border-color: var(--text-muted);
      color: var(--text);
    }
    .md-modal-body {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
    }
    .md-modal-body pre {
      margin: 0;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-family: var(--font-mono);
      font-size: 13px;
      line-height: 1.7;
      color: var(--text-secondary);
    }

    @media (max-width: 600px) {
      .book-header { padding: 32px 0 24px; }
      .book-header h1 { font-size: 24px; }
      .book-content { padding: 24px 0 48px; }
      .md-modal { max-height: 90vh; border-radius: 12px; }
      .md-modal-body { padding: 16px; }
      .md-modal-body pre { font-size: 12px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <nav class="breadcrumb">
      <a href="/">Books for Agents</a> &rsaquo; ${title}
    </nav>

    <header class="book-header">
      <div class="book-meta">
        <span class="book-category">${escapeHtml(m.category)}</span>
        <span>${m.year}</span>
      </div>
      <h1>${title}</h1>
      <div class="book-author">by ${author}</div>
      <div class="one-liner">${description}</div>
      ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ""}
      <button class="btn-view-md" onclick="document.getElementById('md-modal').classList.add('open');document.body.style.overflow='hidden'">View Markdown</button>
    </header>

    <main class="book-content">
      ${contentHtml}
    </main>
  </div>

  <!-- Markdown modal -->
  <div class="md-overlay" id="md-modal" onclick="if(event.target===this){this.classList.remove('open');document.body.style.overflow=''}">
    <div class="md-modal">
      <div class="md-modal-header">
        <span>Raw Markdown</span>
        <div class="md-modal-actions">
          <button class="md-btn-copy" id="md-copy-btn" onclick="(function(b){var t=document.getElementById('raw-md').textContent;navigator.clipboard.writeText(t).then(function(){b.textContent='Copied!';setTimeout(function(){b.textContent='Copy'},1500)})})(this)">Copy</button>
          <button class="md-btn-close" onclick="document.getElementById('md-modal').classList.remove('open');document.body.style.overflow=''">&times;</button>
        </div>
      </div>
      <div class="md-modal-body">
        <pre id="raw-md">${rawMdEscaped}</pre>
      </div>
    </div>
  </div>
  <script>document.addEventListener('keydown',function(e){if(e.key==='Escape'){var m=document.getElementById('md-modal');if(m.classList.contains('open')){m.classList.remove('open');document.body.style.overflow=''}}});</script>

  <footer>
    <div class="container">
      <div class="footer-content">
        <div class="footer-brand"><a href="/">Books for Agents</a></div>
        <div class="footer-links">
          <a href="https://github.com/danpalmieri/books-for-agents" target="_blank">GitHub</a>
          <a href="https://modelcontextprotocol.io" target="_blank">MCP Docs</a>
        </div>
      </div>
    </div>
  </footer>
</body>
</html>`;
}
