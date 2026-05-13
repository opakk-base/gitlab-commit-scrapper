import { isDebugMode } from "./settings";

const LLM_CONFIG_KEY = "llm_config";
const LLM_CONFIGS_KEY = "llm_configs";
const LLM_ACTIVE_CONFIG_KEY = "llm_active_config";
const LLM_SUMMARY_KEY = "llm_summary";
const LLM_PARTIAL_SUMMARY_KEY = "llm_partial_summary";
const LLM_LAST_RAW_RESPONSE_KEY = "llm_last_raw_response";

export type LLMProviderCode = "openai" | "azure" | "ollama" | "groq" | "together" | "openrouter" | "custom";

export interface LLMConfig {
  id: string;
  name: string;
  provider: LLMProviderCode; // Provider code, not URL-based detection
  apiUrl: string;
  apiKey: string;
  model: string; // Active/selected model
  models?: string[]; // Available models for this config
  createdAt?: string;
  updatedAt?: string;
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
  isPartial?: boolean; // Flag for incomplete summaries
}

export interface PartialSummary {
  summary: string;
  modelUsed: string;
  configId: string;
  totalCommits: number;
  generatedAt: string;
  systemPrompt: string;
  userPromptTemplate: string;
  commits: CommitForSummary[];
}

export interface LLMTestResult {
  success: boolean;
  error?: string;
  suggestion?: string;
}

const defaultConfig: Omit<LLMConfig, "id" | "name" | "createdAt" | "updatedAt"> = {
  provider: "openai",
  apiUrl: "https://api.openai.com/v1",
  apiKey: "",
  model: "",
};

// Detect provider from URL (for migration purposes)
function detectProviderFromUrl(url: string): LLMProviderCode {
  if (url.includes("openai.com")) return "openai";
  if (url.includes("groq")) return "groq";
  if (url.includes("ollama") || url.includes("localhost:11434")) return "ollama";
  if (url.includes("together")) return "together";
  if (url.includes("openrouter")) return "openrouter";
  return "custom";
}

// Generate unique ID for config
function generateConfigId(): string {
  return `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Migrate config to include provider field if missing
function migrateConfig(config: any): LLMConfig {
  if (!config.provider) {
    config.provider = detectProviderFromUrl(config.apiUrl || "");
  }
  return config;
}

// Get all LLM configurations
export function getLLMConfigs(): LLMConfig[] {
  const stored = localStorage.getItem(LLM_CONFIGS_KEY);
  if (stored) {
    try {
      const configs = JSON.parse(stored);
      // Migrate any configs without provider field
      const migrated = configs.map(migrateConfig);
      // Save if any migration happened
      if (JSON.stringify(configs) !== JSON.stringify(migrated)) {
        saveLLMConfigs(migrated);
      }
      return migrated;
    } catch {
      return [];
    }
  }
  return [];
}

// Save all LLM configurations
export function saveLLMConfigs(configs: LLMConfig[]): void {
  localStorage.setItem(LLM_CONFIGS_KEY, JSON.stringify(configs));
}

// Get active configuration ID
export function getActiveLLMConfigId(): string | null {
  return localStorage.getItem(LLM_ACTIVE_CONFIG_KEY);
}

// Set active configuration
export function setActiveLLMConfigId(id: string): void {
  localStorage.setItem(LLM_ACTIVE_CONFIG_KEY, id);
}

// Add new LLM configuration
export function addLLMConfig(config: Omit<LLMConfig, "id" | "createdAt" | "updatedAt">): LLMConfig {
  const configs = getLLMConfigs();
  const newConfig: LLMConfig = {
    ...config,
    id: generateConfigId(),
    createdAt: new Date().toISOString(),
  };
  configs.push(newConfig);
  saveLLMConfigs(configs);

  // Set as active if it's the first config
  if (configs.length === 1) {
    setActiveLLMConfigId(newConfig.id);
  }

  return newConfig;
}

// Update existing LLM configuration
export function updateLLMConfig(id: string, updates: Partial<Omit<LLMConfig, "id" | "createdAt">>): LLMConfig | null {
  const configs = getLLMConfigs();
  const index = configs.findIndex(c => c.id === id);

  if (index < 0) return null;

  configs[index] = {
    ...configs[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveLLMConfigs(configs);
  return configs[index];
}

// Delete LLM configuration
export function deleteLLMConfig(id: string): boolean {
  const configs = getLLMConfigs();
  const filtered = configs.filter(c => c.id !== id);

  if (filtered.length === configs.length) return false;

  saveLLMConfigs(filtered);

  // Update active config if deleted was active
  if (getActiveLLMConfigId() === id) {
    if (filtered.length > 0) {
      setActiveLLMConfigId(filtered[0].id);
    } else {
      localStorage.removeItem(LLM_ACTIVE_CONFIG_KEY);
    }
  }

  return true;
}

export function getLLMConfig(): LLMConfig | null {
  // First try to get from multiple configs system
  const configs = getLLMConfigs();
  const activeId = getActiveLLMConfigId();

  if (activeId) {
    const activeConfig = configs.find(c => c.id === activeId);
    if (activeConfig) return activeConfig;
  }

  // Fallback to first config if available
  if (configs.length > 0) {
    return configs[0];
  }

  // Legacy: Try to get from old single config format
  const stored = localStorage.getItem(LLM_CONFIG_KEY);
  if (stored) {
    try {
      const legacyConfig = JSON.parse(stored);
      const apiUrl = legacyConfig.apiUrl || defaultConfig.apiUrl;
      // Migrate to new format
      const newConfig: LLMConfig = {
        id: generateConfigId(),
        name: "Migrated Config",
        provider: detectProviderFromUrl(apiUrl),
        apiUrl: apiUrl,
        apiKey: legacyConfig.apiKey || "",
        model: legacyConfig.model || "",
        createdAt: new Date().toISOString(),
      };
      saveLLMConfigs([newConfig]);
      setActiveLLMConfigId(newConfig.id);
      localStorage.removeItem(LLM_CONFIG_KEY);
      return newConfig;
    } catch {
      return null;
    }
  }
  return null;
}

export function saveLLMConfig(config: LLMConfig): void {
  const configs = getLLMConfigs();
  const existingIndex = configs.findIndex(c => c.id === config.id);

  if (existingIndex >= 0) {
    configs[existingIndex] = { ...config, updatedAt: new Date().toISOString() };
  } else {
    configs.push({ ...config, createdAt: new Date().toISOString() });
  }

  saveLLMConfigs(configs);

  // Set as active if it's the first config
  if (configs.length === 1) {
    setActiveLLMConfigId(config.id);
  }
}

export function clearLLMConfig(): void {
  localStorage.removeItem(LLM_CONFIG_KEY);
  localStorage.removeItem(LLM_CONFIGS_KEY);
  localStorage.removeItem(LLM_ACTIVE_CONFIG_KEY);
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

// Partial summary functions for continue generation
export function savePartialSummary(partial: PartialSummary): void {
  localStorage.setItem(LLM_PARTIAL_SUMMARY_KEY, JSON.stringify(partial));
}

export function getPartialSummary(): PartialSummary | null {
  const stored = localStorage.getItem(LLM_PARTIAL_SUMMARY_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

export function clearPartialSummary(): void {
  localStorage.removeItem(LLM_PARTIAL_SUMMARY_KEY);
}

export function getLastRawLLMResponse(): string | null {
  return localStorage.getItem(LLM_LAST_RAW_RESPONSE_KEY);
}

export function clearLastRawLLMResponse(): void {
  localStorage.removeItem(LLM_LAST_RAW_RESPONSE_KEY);
}

async function parseChatCompletionResponse(response: Response): Promise<string> {
  const raw = await response.text();
  const trimmed = raw.trim();

  if (isDebugMode()) {
    try {
      localStorage.setItem(LLM_LAST_RAW_RESPONSE_KEY, raw.slice(0, 50000));
    } catch {}
  }

  if (!trimmed) {
    throw new Error("Empty response from LLM API.");
  }

  const isJsonObject = trimmed.startsWith("{") && !trimmed.startsWith("data:");
  if (isJsonObject) {
    try {
      const data = JSON.parse(trimmed);
      const content =
        data.choices?.[0]?.message?.content ||
        data.choices?.[0]?.delta?.content ||
        data.message?.content ||
        data.response ||
        "";
      if (content) return content;
    } catch (e) {
      throw new Error(
        `Failed to parse LLM response: ${e instanceof Error ? e.message : String(e)}. First 200 chars: ${trimmed.slice(0, 200)}`
      );
    }
  }

  if (trimmed.includes("data:")) {
    const lines = trimmed.split("\n");
    let fullContent = "";
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || !trimmedLine.startsWith("data:")) continue;
      if (trimmedLine === "data: [DONE]") continue;
      const jsonStr = trimmedLine.replace(/^data:\s*/, "");
      try {
        const chunk = JSON.parse(jsonStr);
        const chunkContent =
          chunk.choices?.[0]?.delta?.content ||
          chunk.choices?.[0]?.message?.content ||
          "";
        fullContent += chunkContent;
      } catch {}
    }
    if (fullContent) return fullContent;
  }

  const lines = trimmed.split("\n").filter((l) => l.trim().startsWith("{"));
  if (lines.length > 0) {
    let fullContent = "";
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        fullContent +=
          obj.message?.content ||
          obj.choices?.[0]?.delta?.content ||
          obj.response ||
          "";
      } catch {}
    }
    if (fullContent) return fullContent;
  }

  throw new Error(
    `Received malformed response from LLM. The API may have returned a streaming or invalid payload. First 200 chars: ${trimmed.slice(0, 200)}`
  );
}

export async function testLLMConnection(config: LLMConfig): Promise<LLMTestResult> {
  try {
    // Normalize URL
    const baseUrl = config.apiUrl.replace(/\/+$/, "");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Only add Authorization header if API key is provided
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    // For Ollama, use native /api/tags endpoint
    if (config.provider === "ollama") {
      // Remove /v1 suffix if present and use native Ollama API
      const ollamaBaseUrl = baseUrl.replace(/\/v1$/, "");
      const response = await fetch(`${ollamaBaseUrl}/api/tags`, {
        method: "GET",
        headers,
      });

      if (response.ok) {
        return { success: true };
      }

      if (response.status === 401) {
        return {
          success: false,
          error: "Unauthorized",
          suggestion: "Check if Ollama requires authentication (uncommon for local instances).",
        };
      }

      // Fallback to OpenAI-compatible endpoint
      const fallbackResponse = await fetch(`${baseUrl}/models`, {
        method: "GET",
        headers,
      });

      if (fallbackResponse.ok) {
        return { success: true };
      }

      return {
        success: false,
        error: "Cannot connect to Ollama",
        suggestion: "Ensure Ollama is running with 'ollama serve' and the URL is correct.",
      };
    }

    // For other providers, use OpenAI-compatible /models endpoint
    const response = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers,
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

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Only add Authorization header if API key is provided
    if (config.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    // For Ollama, use native /api/tags endpoint for better model listing
    if (config.provider === "ollama") {
      // Remove /v1 suffix if present and use native Ollama API
      const ollamaBaseUrl = baseUrl.replace(/\/v1$/, "");
      const response = await fetch(`${ollamaBaseUrl}/api/tags`, {
        method: "GET",
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        // Ollama /api/tags returns: {"models": [{"name": "llama3:latest", ...}]}
        return data.models?.map((model: { name: string }) => model.name).sort() || [];
      }

      // Fallback to OpenAI-compatible endpoint if /api/tags fails
      const fallbackResponse = await fetch(`${baseUrl}/models`, {
        method: "GET",
        headers,
      });

      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json();
        return data.data?.map((model: { id: string }) => model.id).sort() || [];
      }

      return [];
    }

    // For other providers, use OpenAI-compatible /models endpoint
    const response = await fetch(`${baseUrl}/models`, {
      method: "GET",
      headers,
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
  const userPrompt = userPromptTemplate
    .replace("{{commitCount}}", String(commits.length))
    .replace("{{commits}}", formattedCommits);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  // Only add Authorization header if API key is provided
  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
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
      stream: false,
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

  return await parseChatCompletionResponse(response);
}

// Continue generating from a partial summary
export async function continueSummaryGeneration(
  config: LLMConfig,
  partialSummary: string,
  systemPrompt: string,
  userPromptTemplate: string,
  commits: CommitForSummary[]
): Promise<string> {
  const baseUrl = config.apiUrl.replace(/\/+$/, "");

  // Format commits for context (shorter version for continuation)
  const formattedCommits = commits
    .slice(0, 50) // Limit for continuation
    .map((c, i) => {
      let commitText = `${i + 1}. **${c.title}**\n`;
      commitText += `   - Project: ${c.project} | Author: ${c.author} | Branch: ${c.branch}\n`;
      return commitText;
    })
    .join("\n");

  const continuePrompt = `You were generating a Git commit summary but it was interrupted. Here is the partial summary you generated:

---
${partialSummary}
---

Please continue the summary from where you left off. Do not repeat what was already written. Continue naturally and complete the summary in the same style and format.

Original commits context (for reference):
${formattedCommits}

Total commits: ${commits.length}

Continue the summary:`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: continuePrompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 4000,
      stream: false,
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

    throw new Error(`API request failed (${response.status}): ${errorText || response.statusText}`);
  }

  const continuation = await parseChatCompletionResponse(response);

  return partialSummary + "\n\n" + continuation;
}

export interface HumanizeOptions {
  style?: "professional" | "casual" | "concise" | "custom";
  customPrompt?: string;
  modelOverride?: string;
}

export async function humanizeText(
  config: LLMConfig,
  originalText: string,
  options?: HumanizeOptions
): Promise<string> {
  const baseUrl = config.apiUrl.replace(/\/+$/, "");
  const style = options?.style || "professional";
  const modelToUse = options?.modelOverride || config.model;

  let systemPrompt: string;
  let userPrompt: string;

  if (style === "custom" && options?.customPrompt) {
    // Custom prompt mode
    systemPrompt = `You are an expert text editor. Your task is to rewrite the given text according to the user's custom instructions.

Important guidelines:
1. Follow the user's instructions precisely
2. Preserve all factual information unless instructed otherwise
3. Maintain the Markdown formatting structure
4. Output ONLY the rewritten text, no explanations or meta-comments`;

    userPrompt = `${options.customPrompt}

---
${originalText}
---

Rewritten version:`;
  } else {
    // Preset style mode
    systemPrompt = `You are an expert text editor specializing in humanizing AI-generated content. Your task is to rewrite the given text to make it sound more natural, human-written, and engaging while preserving all the information.

Guidelines for humanizing:
1. Remove robotic, formulaic, or overly structured AI-like phrasing
2. Add natural transitions and flow between sections
3. Use varied sentence structures - mix short and long sentences
4. Replace generic introductions with more engaging openings
5. Add contextual nuances that a human writer would naturally include
6. Keep the same factual information - don't add or remove facts
7. Maintain the Markdown formatting structure
8. Use conversational yet ${style === "casual" ? "friendly and relaxed" : style === "concise" ? "clear and direct" : "professional"} language
9. Avoid phrases like "In conclusion", "Furthermore", "Additionally" unless they feel natural
10. Make bullet points feel less mechanical when appropriate

Important: Output ONLY the humanized text, no explanations or meta-comments.`;

    userPrompt = `Please humanize the following AI-generated summary, making it sound more natural and human-written while keeping all the information intact. Use a ${style} tone.

---
${originalText}
---

Humanized version:`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (config.apiKey) {
    headers["Authorization"] = `Bearer ${config.apiKey}`;
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: modelToUse,
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
      temperature: 0.8,
      max_tokens: 4000,
      stream: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (response.status === 401) {
      throw new Error("Invalid API Key. Please check your API key in LLM Settings.");
    }

    if (response.status === 404) {
      throw new Error(`Model "${modelToUse}" not found. Please select a different model in LLM Settings.`);
    }

    if (response.status === 429) {
      throw new Error("Rate limited. Please wait a moment and try again.");
    }

    throw new Error(`API request failed (${response.status}): ${errorText || response.statusText}`);
  }

  return await parseChatCompletionResponse(response);
}