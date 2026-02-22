export function renderNotFoundPage(baseUrl: string): string {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Book not found — Books for Agents</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📚</text></svg>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #0a0a0a;
      --bg-surface: #111113;
      --border: #222225;
      --text: #e5e5e7;
      --text-secondary: #8a8a8e;
      --text-muted: #555558;
      --accent: #00d4aa;
      --accent-hover: #00f0c0;
      --accent-dim: #00d4aa22;
      --font-sans: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
    }
    body {
      font-family: var(--font-sans);
      background: var(--bg);
      color: var(--text);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 24px;
    }
    .code { font-size: 72px; font-weight: 800; color: var(--text-muted); letter-spacing: -0.03em; }
    h1 { font-size: 24px; font-weight: 700; margin: 16px 0 8px; }
    p { font-size: 16px; color: var(--text-secondary); margin-bottom: 32px; }
    a.btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      background: var(--accent);
      color: #0a0a0a;
      text-decoration: none;
      transition: all 0.2s;
      box-shadow: 0 0 20px var(--accent-dim);
    }
    a.btn:hover { background: var(--accent-hover); transform: translateY(-1px); }
  </style>
</head>
<body>
  <div class="code">404</div>
  <h1>Book not found</h1>
  <p>The book you're looking for doesn't exist in our knowledge base yet.</p>
  <a class="btn" href="/">Back to home</a>
</body>
</html>`;
}
