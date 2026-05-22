const SCRAPED_COMMITS_KEY = "scraped_commits";
const SCRAPER_CONFIG_KEY = "scraper_config";
const CUSTOM_PROMPT_KEY = "custom_prompt";

import { GitLabCommit, GitLabCommitDiff } from "./gitlab";

export interface CommitWithProject extends GitLabCommit {
  projectId: number;
  projectName: string;
  branch: string;
  diffs?: GitLabCommitDiff[];
}

export interface ScraperConfig {
  projectIds: number[];
  sinceDate: string;
  untilDate: string;
  branch: string;
  includeDiffs: boolean;
  scrapedAt: string;
}

export interface CustomPrompt {
  systemPrompt: string;
  userPromptTemplate: string;
}

const defaultCustomPrompt: CustomPrompt = {
  systemPrompt: `You are an expert software developer and technical writer who analyzes Git commit history. You provide detailed, insightful summaries that help teams understand code changes, patterns, and progress.

**Your response MUST be formatted in Markdown.** Use:
- Headings (# ## ### ####) to organize sections
- Bullet points (- or *) for lists
- **Bold** for emphasis on important items
- \`code\` for file names, commit IDs, and technical terms
- Tables when comparing or listing data
- Code blocks with \`\`\` for multi-line code or logs
- **Code Screenshot Tag**: Always insert the exact string \`{SCREENSHOT CODE}\` on a new line immediately following any file references or list of files modified (e.g. 'Referensi File: file1.php, file2.php') so that the application can render high-quality code snapshot mockups for those files.

Focus on:
1. Technical changes and their significance
2. Code patterns and architectural decisions
3. File types and areas being modified
4. Developer activity and collaboration patterns
5. Potential impacts and risks of changes

Be concise but thorough. Make the summary scannable and actionable.`,
  userPromptTemplate: `Analyze the following Git commits and provide a comprehensive **Markdown-formatted** summary.

---

## 📊 Overview

Provide a 2-3 paragraph summary of the overall activity. Highlight the main themes and focus areas.

---

## 🔑 Key Changes

List the main features, fixes, or changes being developed:

- **Change 1**: Description
- **Change 2**: Description
- ...

---

## 📁 Files & Components

Summarize the files and components being modified. Group by category if helpful:

| File/Component | Changes | Purpose |
|----------------|---------|---------|
| \`path/to/file\` | Added/Modified/Deleted | Reason |

---

## ⚙️ Technical Details

Highlight notable patterns, architectural changes, or technical decisions:

### Patterns Observed
- Pattern 1
- Pattern 2

### Architecture Changes
- Change 1
- Change 2

---

## 👥 Contributors

| Contributor | Commits | Focus Areas |
|-------------|---------|-------------|
| Name | Count | Areas |

---

## 💡 Recommendations

Provide actionable suggestions for the team:

1. Recommendation 1
2. Recommendation 2

---

## 📈 Commits to Analyze

**Total commits:** {{commitCount}}

{{commits}}

---

Please provide your analysis in the Markdown format specified above. Be specific and actionable.`
};

export function getScrapedCommits(): CommitWithProject[] {
  const stored = localStorage.getItem(SCRAPED_COMMITS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

export function saveScrapedCommits(commits: CommitWithProject[]): void {
  localStorage.setItem(SCRAPED_COMMITS_KEY, JSON.stringify(commits));
}

export function clearScrapedCommits(): void {
  localStorage.removeItem(SCRAPED_COMMITS_KEY);
}

export function getScraperConfig(): ScraperConfig | null {
  const stored = localStorage.getItem(SCRAPER_CONFIG_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

export function saveScraperConfig(config: ScraperConfig): void {
  localStorage.setItem(SCRAPER_CONFIG_KEY, JSON.stringify(config));
}

export function clearScraperConfig(): void {
  localStorage.removeItem(SCRAPER_CONFIG_KEY);
}

export function getCustomPrompt(): CustomPrompt {
  const stored = localStorage.getItem(CUSTOM_PROMPT_KEY);
  if (stored) {
    try {
      return { ...defaultCustomPrompt, ...JSON.parse(stored) };
    } catch {
      return defaultCustomPrompt;
    }
  }
  return defaultCustomPrompt;
}

export function saveCustomPrompt(prompt: CustomPrompt): void {
  localStorage.setItem(CUSTOM_PROMPT_KEY, JSON.stringify(prompt));
}

export function clearCustomPrompt(): void {
  localStorage.removeItem(CUSTOM_PROMPT_KEY);
}

export function getDefaultCustomPrompt(): CustomPrompt {
  return defaultCustomPrompt;
}