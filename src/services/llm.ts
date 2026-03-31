const LLM_CONFIG_KEY = "llm_config";
const LLM_SUMMARY_KEY = "llm_summary";

export interface LLMConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
}

export interface LLMSummary {
  summary: string;
  keyPoints: string[];
  topContributors: { name: string; commits: number }[];
  projectBreakdown: { project: string; commits: number }[];
  generatedAt: string;
  modelUsed: string;
  totalCommits: number;
  promptUsed?: string;
}

export interface LLMTestResult {
  success: boolean;
  error?: string;
  suggestion?: string;
}

const defaultConfig: LLMConfig = {
  apiUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "gpt-3.5-turbo",
};

export function getLLMConfig(): LLMConfig {
  const stored = localStorage.getItem(LLM_CONFIG_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return { ...defaultConfig, ...parsed };
    } catch {
      return defaultConfig;
    }
  }
  return defaultConfig;
}

export function saveLLMConfig(config: LLMConfig): void {
  localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(config));
}

export function clearLLMConfig(): void {
  localStorage.removeItem(LLM_CONFIG_KEY);
}

export function getLLMSummary(): LLMSummary | null {
  const stored = localStorage.getItem(LLM_SUMMARY_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

export function saveLLMSummary(summary: LLMSummary): void {
  localStorage.setItem(LLM_SUMMARY_KEY, JSON.stringify(summary));
}

export function clearLLMSummary(): void {
  localStorage.removeItem(LLM_SUMMARY_KEY);
}

export async function testLLMConnection(config: LLMConfig): Promise<LLMTestResult> {
  try {
    // Normalize URL
    const baseUrl = config.apiUrl.replace(/\/+$/, "");

    const response = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      return { success: true };
    }

    if (response.status === 401) {
      return {
        success: false,
        error: "Invalid API Key",
        suggestion: "Check that your API key is correct and has not expired.",
      };
    }

    if (response.status === 404) {
      // Some APIs don't have /models endpoint, try a simple completion instead
      return {
        success: true, // Assume it works
      };
    }

    const errorText = await response.text();
    return {
      success: false,
      error: `API returned ${response.status}: ${response.statusText}`,
      suggestion: "Check that the API URL is correct and the service is running.",
    };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes("fetch")) {
      return {
        success: false,
        error: "Network error - Cannot reach API",
        suggestion: "Check the API URL. For local APIs (Ollama), ensure the server is running. For cloud APIs, check your internet connection.",
      };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      suggestion: "An unexpected error occurred. Check the console for details.",
    };
  }
}

export async function getAvailableModels(config: LLMConfig): Promise<string[]> {
  try {
    const baseUrl = config.apiUrl.replace(/\/+$/, "");

    const response = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.data?.map((model: { id: string }) => model.id).sort() || [];
  } catch (error) {
    console.error("Failed to fetch models:", error);
    return [];
  }
}

export interface CommitForSummary {
  title: string;
  message: string;
  author: string;
  project: string;
  branch: string;
  date: string;
  sha: string;
  diffs?: {
    old_path: string;
    new_path: string;
    new_file: boolean;
    renamed_file: boolean;
    deleted_file: boolean;
    additions?: number;
    deletions?: number;
  }[];
}

export async function generateCommitSummary(
  config: LLMConfig,
  commits: CommitForSummary[],
  systemPrompt: string,
  userPromptTemplate: string
): Promise<string> {
  const baseUrl = config.apiUrl.replace(/\/+$/, "");

  // Format commits for the prompt
  const formattedCommits = commits
    .slice(0, 100) // Limit to avoid token limits
    .map((c, i) => {
      let commitText = `${i + 1}. **${c.title}**\n`;
      commitText += `   - Project: ${c.project}\n`;
      commitText += `   - Author: ${c.author}\n`;
      commitText += `   - Branch: ${c.branch}\n`;
      commitText += `   - Date: ${c.date}\n`;
      commitText += `   - SHA: ${c.sha}\n`;

      if (c.message && c.message !== c.title) {
        commitText += `   - Message: ${c.message.substring(0, 500)}${c.message.length > 500 ? "..." : ""}\n`;
      }

      if (c.diffs && c.diffs.length > 0) {
        commitText += `   - Files changed (${c.diffs.length}):\n`;
        c.diffs.slice(0, 10).forEach((diff) => {
          const filePath = diff.new_path || diff.old_path;
          const status = diff.new_file ? " (new)" : diff.renamed_file ? " (renamed)" : diff.deleted_file ? " (deleted)" : "";
          commitText += `     • ${filePath}${status}\n`;
        });
        if (c.diffs.length > 10) {
          commitText += `     • ... and ${c.diffs.length - 10} more files\n`;
        }
      }

      return commitText;
    })
    .join("\n");

  // Replace placeholders in user prompt
  let userPrompt = userPromptTemplate
    .replace("{{commitCount}}", String(commits.length))
    .replace("{{commits}}", formattedCommits);

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 401) {
      throw new Error("Invalid API Key. Please check your API key in LLM Settings.");
    }

    if (response.status === 404) {
      throw new Error(`Model "${config.model}" not found. Please select a different model in LLM Settings.`);
    }

    if (response.status === 429) {
      throw new Error("Rate limited. Please wait a moment and try again.");
    }

    if (response.status === 400) {
      throw new Error(`Bad request: ${errorText}. The prompt may be too long or the model doesn't support the request format.`);
    }

    throw new Error(`API request failed (${response.status}): ${errorText || response.statusText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}