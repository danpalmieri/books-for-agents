export interface SubmitBookInput {
  slug: string;
  title: string;
  author: string;
  category: string;
  content: string;
}

const REPO = "danpalmieri/books-for-agents";

export async function submitBook(
  input: SubmitBookInput,
  githubToken: string
): Promise<object> {
  if (!githubToken) {
    return {
      error: "GitHub token not configured on this server. The book was not submitted.",
      fallback:
        "Copy the generated content, clone the repo, save to " +
        `books/${input.category}/${input.slug}.md, and open a PR manually.`,
      content: input.content,
    };
  }

  const issueTitle = `Add: ${input.title} — ${input.author}`;
  const issueBody = [
    `## Generated Book Summary`,
    "",
    `**Title:** ${input.title}`,
    `**Author:** ${input.author}`,
    `**Category:** ${input.category}`,
    `**File:** \`books/${input.category}/${input.slug}.md\``,
    "",
    "---",
    "",
    "```markdown",
    input.content,
    "```",
    "",
    "---",
    "*This summary was generated via the `generate_book` MCP tool by a contributor donating their tokens.*",
  ].join("\n");

  const response = await fetch(`https://api.github.com/repos/${REPO}/issues`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "books-for-agents-mcp",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify({
      title: issueTitle,
      body: issueBody,
      labels: ["generated-summary", input.category],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      error: `GitHub API error (${response.status}): ${errorText}`,
      fallback:
        "Copy the generated content and open a PR manually.",
    };
  }

  const issue = (await response.json()) as { html_url: string; number: number };

  return {
    success: true,
    issueUrl: issue.html_url,
    issueNumber: issue.number,
    message: `Book summary submitted as issue #${issue.number}. A maintainer will review and merge it. Thank you for donating your tokens!`,
  };
}
