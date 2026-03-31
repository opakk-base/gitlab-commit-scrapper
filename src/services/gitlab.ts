const GITLAB_CONFIG_KEY = "gitlab_config";
const GITLAB_CONFIGS_KEY = "gitlab_configs";
const GITLAB_ACTIVE_CONFIG_KEY = "gitlab_active_config";

export interface GitLabConfig {
  id: string;
  name: string;
  url: string;
  pat: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
}

export interface GitLabCommit {
  id: string;
  short_id: string;
  title: string;
  message?: string;
  author_name: string;
  author_email: string;
  created_at: string;
  web_url: string;
}

export interface GitLabCommitDiff {
  old_path: string;
  new_path: string;
  diff: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
}

export interface GitLabCommitDetail extends GitLabCommit {
  message: string;
  parent_ids: string[];
  stats: {
    additions: number;
    deletions: number;
    total: number;
  };
  files_changed: number;
}

export interface GitLabBranch {
  name: string;
  merged: boolean;
  protected: boolean;
  default: boolean;
  developers_can_push: boolean;
  developers_can_merge: boolean;
  web_url: string;
}

export interface GitLabError {
  code: string;
  message: string;
  suggestion: string;
  details?: string;
}

export class GitLabApiError extends Error {
  public gitlabError: GitLabError;

  constructor(gitlabError: GitLabError) {
    super(gitlabError.message);
    this.gitlabError = gitlabError;
    this.name = "GitLabApiError";
  }
}

function parseGitLabError(
  status: number,
  statusText: string,
  body?: string
): GitLabError {
  // Try to parse GitLab's error response
  let errorBody: { message?: string; error?: string } = {};
  if (body) {
    try {
      errorBody = JSON.parse(body);
    } catch {
      // Ignore parse errors
    }
  }

  const errorMessage = errorBody.message || errorBody.error || statusText;

  switch (status) {
    case 0:
      return {
        code: "NETWORK_ERROR",
        message: "Network Error - Cannot reach GitLab server",
        suggestion:
          "Check if the GitLab URL is correct and the server is accessible. Ensure you're not behind a firewall or proxy that blocks the connection.",
        details: "The request failed to complete. This could be due to CORS policy, network connectivity, or the server being down.",
      };

    case 400:
      return {
        code: "BAD_REQUEST",
        message: `Bad Request - ${errorMessage}`,
        suggestion:
          "Check your request parameters. The API endpoint may have changed or your query parameters are invalid.",
        details: body,
      };

    case 401:
      return {
        code: "UNAUTHORIZED",
        message: "Unauthorized - Invalid or expired Personal Access Token",
        suggestion:
          "Verify your PAT is correct and hasn't expired. Go to GitLab → User Settings → Access Tokens to check or create a new token.",
        details: "The token may be revoked, expired, or have insufficient permissions.",
      };

    case 403:
      return {
        code: "FORBIDDEN",
        message: "Forbidden - Token lacks required permissions",
        suggestion:
          "Ensure your PAT has 'read_api' and 'read_repository' scopes. Go to GitLab → User Settings → Access Tokens to create a token with these scopes.",
        details: `Token scopes required: read_api, read_repository. ${errorMessage}`,
      };

    case 404:
      return {
        code: "NOT_FOUND",
        message: "Not Found - GitLab API endpoint or resource not found",
        suggestion:
          "Verify the GitLab URL is correct and includes the full domain (e.g., https://gitlab.com). For self-hosted GitLab, ensure the API path is accessible.",
        details: "The requested endpoint does not exist. This could mean wrong URL or API version.",
      };

    case 429:
      return {
        code: "RATE_LIMITED",
        message: "Rate Limited - Too many requests",
        suggestion:
          "Wait a few minutes before retrying. GitLab has rate limits on API requests. Consider reducing the number of parallel requests.",
        details: errorMessage,
      };

    case 500:
      return {
        code: "SERVER_ERROR",
        message: "Internal Server Error - GitLab server encountered an error",
        suggestion:
          "This is a GitLab server-side issue. Try again later or contact your GitLab administrator if the problem persists.",
        details: errorMessage,
      };

    case 502:
    case 503:
    case 504:
      return {
        code: "SERVICE_UNAVAILABLE",
        message: "Service Unavailable - GitLab server is temporarily down",
        suggestion:
          "The GitLab server may be restarting or under maintenance. Wait a few minutes and try again.",
        details: `${status} - ${statusText}`,
      };

    default:
      return {
        code: "UNKNOWN_ERROR",
        message: `Unknown Error (${status}) - ${errorMessage}`,
        suggestion:
          "An unexpected error occurred. Check the GitLab URL and PAT, and try again. If the problem persists, check GitLab's status page.",
        details: body || statusText,
      };
  }
}

export function getGitLabConfig(): GitLabConfig | null {
  // First try to get from multiple configs system
  const configs = getGitLabConfigs();
  const activeId = getActiveGitLabConfigId();

  if (activeId) {
    const activeConfig = configs.find(c => c.id === activeId);
    if (activeConfig) return activeConfig;
  }

  // Fallback to first config if available
  if (configs.length > 0) {
    return configs[0];
  }

  // Legacy: Try to get from old single config format
  const stored = localStorage.getItem(GITLAB_CONFIG_KEY);
  if (stored) {
    try {
      const legacyConfig = JSON.parse(stored);
      // Migrate to new format
      const newConfig: GitLabConfig = {
        id: generateConfigId(),
        name: "Migrated Config",
        url: legacyConfig.url || "",
        pat: legacyConfig.pat || "",
        createdAt: new Date().toISOString(),
      };
      saveGitLabConfigs([newConfig]);
      setActiveGitLabConfigId(newConfig.id);
      localStorage.removeItem(GITLAB_CONFIG_KEY);
      return newConfig;
    } catch {
      return null;
    }
  }
  return null;
}

export function saveGitLabConfig(config: GitLabConfig): void {
  const configs = getGitLabConfigs();
  const existingIndex = configs.findIndex(c => c.id === config.id);

  if (existingIndex >= 0) {
    configs[existingIndex] = { ...config, updatedAt: new Date().toISOString() };
  } else {
    configs.push({ ...config, createdAt: new Date().toISOString() });
  }

  saveGitLabConfigs(configs);

  // Set as active if it's the first config
  if (configs.length === 1) {
    setActiveGitLabConfigId(config.id);
  }
}

export function clearGitLabConfig(): void {
  localStorage.removeItem(GITLAB_CONFIG_KEY);
  localStorage.removeItem(GITLAB_CONFIGS_KEY);
  localStorage.removeItem(GITLAB_ACTIVE_CONFIG_KEY);
}

// Generate unique ID for config
function generateConfigId(): string {
  return `gitlab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get all GitLab configurations
export function getGitLabConfigs(): GitLabConfig[] {
  const stored = localStorage.getItem(GITLAB_CONFIGS_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

// Save all GitLab configurations
export function saveGitLabConfigs(configs: GitLabConfig[]): void {
  localStorage.setItem(GITLAB_CONFIGS_KEY, JSON.stringify(configs));
}

// Get active configuration ID
export function getActiveGitLabConfigId(): string | null {
  return localStorage.getItem(GITLAB_ACTIVE_CONFIG_KEY);
}

// Set active configuration
export function setActiveGitLabConfigId(id: string): void {
  localStorage.setItem(GITLAB_ACTIVE_CONFIG_KEY, id);
}

// Add new GitLab configuration
export function addGitLabConfig(config: Omit<GitLabConfig, "id" | "createdAt" | "updatedAt">): GitLabConfig {
  const configs = getGitLabConfigs();
  const newConfig: GitLabConfig = {
    ...config,
    id: generateConfigId(),
    createdAt: new Date().toISOString(),
  };
  configs.push(newConfig);
  saveGitLabConfigs(configs);

  // Set as active if it's the first config
  if (configs.length === 1) {
    setActiveGitLabConfigId(newConfig.id);
  }

  return newConfig;
}

// Update existing GitLab configuration
export function updateGitLabConfig(id: string, updates: Partial<Omit<GitLabConfig, "id" | "createdAt">>): GitLabConfig | null {
  const configs = getGitLabConfigs();
  const index = configs.findIndex(c => c.id === id);

  if (index < 0) return null;

  configs[index] = {
    ...configs[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveGitLabConfigs(configs);
  return configs[index];
}

// Delete GitLab configuration
export function deleteGitLabConfig(id: string): boolean {
  const configs = getGitLabConfigs();
  const filtered = configs.filter(c => c.id !== id);

  if (filtered.length === configs.length) return false;

  saveGitLabConfigs(filtered);

  // Update active config if deleted was active
  if (getActiveGitLabConfigId() === id) {
    if (filtered.length > 0) {
      setActiveGitLabConfigId(filtered[0].id);
    } else {
      localStorage.removeItem(GITLAB_ACTIVE_CONFIG_KEY);
    }
  }

  return true;
}

export async function testGitLabConnection(config: GitLabConfig): Promise<{
  success: boolean;
  user?: { name: string; username: string; email: string };
  version?: string;
}> {
  // Test by fetching current user info
  const userResponse = await fetch(`${config.url}/api/v4/user`, {
    headers: {
      "PRIVATE-TOKEN": config.pat,
    },
  });

  if (!userResponse.ok) {
    const body = await userResponse.text();
    throw new GitLabApiError(parseGitLabError(userResponse.status, userResponse.statusText, body));
  }

  const user = await userResponse.json();

  // Also fetch GitLab version
  let version = "Unknown";
  try {
    const versionResponse = await fetch(`${config.url}/api/v4/version`, {
      headers: {
        "PRIVATE-TOKEN": config.pat,
      },
    });
    if (versionResponse.ok) {
      const versionData = await versionResponse.json();
      version = versionData.version || "Unknown";
    }
  } catch {
    // Version endpoint may not be available on some GitLab instances
  }

  return {
    success: true,
    user: {
      name: user.name || "Unknown",
      username: user.username || "Unknown",
      email: user.email || "Unknown",
    },
    version,
  };
}

export async function fetchProjects(
  config: GitLabConfig
): Promise<GitLabProject[]> {
  const response = await fetch(
    `${config.url}/api/v4/projects?membership=true&per_page=100`,
    {
      headers: {
        "PRIVATE-TOKEN": config.pat,
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new GitLabApiError(
      parseGitLabError(response.status, response.statusText, body)
    );
  }

  return response.json();
}

export async function fetchBranches(
  config: GitLabConfig,
  projectId: number
): Promise<GitLabBranch[]> {
  const response = await fetch(
    `${config.url}/api/v4/projects/${projectId}/repository/branches?per_page=100`,
    {
      headers: {
        "PRIVATE-TOKEN": config.pat,
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new GitLabApiError(
      parseGitLabError(response.status, response.statusText, body)
    );
  }

  return response.json();
}

export async function fetchCommits(
  config: GitLabConfig,
  projectId: number,
  since?: string,
  until?: string,
  branch?: string
): Promise<GitLabCommit[]> {
  let url = `${config.url}/api/v4/projects/${projectId}/repository/commits?per_page=100`;
  if (since) url += `&since=${since}`;
  if (until) url += `&until=${until}`;
  if (branch) url += `&ref_name=${encodeURIComponent(branch)}`;

  const response = await fetch(url, {
    headers: {
      "PRIVATE-TOKEN": config.pat,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new GitLabApiError(
      parseGitLabError(response.status, response.statusText, body)
    );
  }

  return response.json();
}

export async function fetchCommitsForProjects(
  config: GitLabConfig,
  projectIds: number[],
  since?: string,
  until?: string,
  branch?: string
): Promise<Map<number, GitLabCommit[]>> {
  const results = new Map<number, GitLabCommit[]>();

  await Promise.all(
    projectIds.map(async (projectId) => {
      try {
        const commits = await fetchCommits(config, projectId, since, until, branch);
        results.set(projectId, commits);
      } catch (error) {
        console.error(
          `Failed to fetch commits for project ${projectId}:`,
          error
        );
        results.set(projectId, []);
      }
    })
  );

  return results;
}

export async function fetchCommitDiff(
  config: GitLabConfig,
  projectId: number,
  commitSha: string
): Promise<GitLabCommitDiff[]> {
  const response = await fetch(
    `${config.url}/api/v4/projects/${projectId}/repository/commits/${commitSha}/diff`,
    {
      headers: {
        "PRIVATE-TOKEN": config.pat,
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new GitLabApiError(
      parseGitLabError(response.status, response.statusText, body)
    );
  }

  return response.json();
}

export async function fetchCommitDetail(
  config: GitLabConfig,
  projectId: number,
  commitSha: string
): Promise<GitLabCommitDetail> {
  const response = await fetch(
    `${config.url}/api/v4/projects/${projectId}/repository/commits/${commitSha}`,
    {
      headers: {
        "PRIVATE-TOKEN": config.pat,
      },
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new GitLabApiError(
      parseGitLabError(response.status, response.statusText, body)
    );
  }

  return response.json();
}

export interface CommitWithDiff {
  commit: GitLabCommit;
  diffs: GitLabCommitDiff[];
  projectPath: string;
  projectId: number;
}

export async function fetchCommitsWithDiffs(
  config: GitLabConfig,
  projectId: number,
  projectPath: string,
  since?: string,
  until?: string,
  branch?: string,
  maxCommits: number = 50
): Promise<CommitWithDiff[]> {
  const commits = await fetchCommits(config, projectId, since, until, branch);
  const results: CommitWithDiff[] = [];

  // Limit number of commits to fetch diffs for
  const commitsToProcess = commits.slice(0, maxCommits);

  for (const commit of commitsToProcess) {
    try {
      const diffs = await fetchCommitDiff(config, projectId, commit.id);
      results.push({
        commit,
        diffs,
        projectPath,
        projectId,
      });
    } catch (error) {
      console.error(`Failed to fetch diff for commit ${commit.id}:`, error);
      results.push({
        commit,
        diffs: [],
        projectPath,
        projectId,
      });
    }
  }

  return results;
}