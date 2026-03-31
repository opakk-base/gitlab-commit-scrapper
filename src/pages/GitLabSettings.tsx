import { useState } from "react";
import {
  GitLabConfig,
  getGitLabConfig,
  saveGitLabConfig,
  clearGitLabConfig,
  fetchProjects,
  testGitLabConnection,
  GitLabProject,
  GitLabApiError,
  GitLabError,
} from "../services/gitlab";
import { isDebugMode } from "../services/settings";
import ErrorDisplay from "../components/ErrorDisplay";

export default function GitLabSettings() {
  const [config, setConfig] = useState<GitLabConfig>(() => {
    const stored = getGitLabConfig();
    return stored || { url: "", pat: "" };
  });

  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [userInfo, setUserInfo] = useState<{
    name: string;
    username: string;
    email: string;
  } | null>(null);
  const [gitlabVersion, setGitlabVersion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GitLabError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rawError, setRawError] = useState<unknown>(null);

  const handleSave = () => {
    if (!config.url || !config.pat) {
      setError({
        code: "VALIDATION_ERROR",
        message: "Please fill in all fields",
        suggestion: "Both GitLab URL and Personal Access Token are required.",
      });
      return;
    }

    const normalizedUrl = config.url.replace(/\/+$/, "");
    saveGitLabConfig({ url: normalizedUrl, pat: config.pat });
    setSuccess("Configuration saved successfully");
    setError(null);
    setRawError(null);
  };

  const handleTestConnection = async () => {
    if (!config.url || !config.pat) {
      setError({
        code: "VALIDATION_ERROR",
        message: "Please fill in all fields first",
        suggestion:
          "Enter your GitLab URL and Personal Access Token before testing the connection.",
      });
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setUserInfo(null);
    setGitlabVersion(null);
    setRawError(null);

    try {
      const normalizedUrl = config.url.replace(/\/+$/, "");
      const gitlabConfig = { url: normalizedUrl, pat: config.pat };

      const connectionResult = await testGitLabConnection(gitlabConfig);
      setUserInfo(connectionResult.user);
      setGitlabVersion(connectionResult.version);

      const fetchedProjects = await fetchProjects(gitlabConfig);
      setProjects(fetchedProjects);

      setSuccess(
        `Connected successfully! Found ${fetchedProjects.length} projects.`
      );
    } catch (err) {
      setRawError(err);
      if (err instanceof GitLabApiError) {
        setError(err.gitlabError);
      } else if (err instanceof Error) {
        setError({
          code: "UNKNOWN_ERROR",
          message: err.message,
          suggestion: "An unexpected error occurred. Please try again.",
          details: isDebugMode() ? err.stack : undefined,
        });
      } else {
        setError({
          code: "UNKNOWN_ERROR",
          message: "Connection failed",
          suggestion: "An unexpected error occurred. Please try again.",
          details: isDebugMode()
            ? JSON.stringify(err, null, 2)
            : undefined,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    clearGitLabConfig();
    setConfig({ url: "", pat: "" });
    setProjects([]);
    setUserInfo(null);
    setGitlabVersion(null);
    setSuccess("Configuration cleared");
    setError(null);
    setRawError(null);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* GitLab Configuration */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">GitLab Configuration</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GitLab URL
            </label>
            <input
              type="text"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value })}
              placeholder="https://gitlab.example.com"
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your GitLab instance URL (e.g., https://gitlab.com for public
              GitLab)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Personal Access Token (PAT)
            </label>
            <input
              type="password"
              value={config.pat}
              onChange={(e) => setConfig({ ...config, pat: e.target.value })}
              placeholder="glpat-xxxxxxxxxxxx"
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Token with <code>read_api</code> and <code>read_repository</code>{" "}
              scopes
            </p>
          </div>

          {/* Error Display */}
          {error && <ErrorDisplay error={error} />}

          {/* Debug mode: show raw error */}
          {error && isDebugMode() && rawError && (
            <details className="mt-2" open>
              <summary className="text-sm text-red-500 cursor-pointer hover:underline font-medium">
                Raw Error Object (Debug)
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-700 overflow-auto">
                {rawError instanceof Error
                  ? `${rawError.name}: ${rawError.message}\n${rawError.stack}`
                  : JSON.stringify(rawError, null, 2)}
              </pre>
            </details>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">✅</span>
                <div className="flex-1">
                  <p className="font-medium text-green-800">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* User Info */}
          {userInfo && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-2xl">👤</span>
                <div className="flex-1">
                  <p className="font-medium text-blue-800 mb-2">
                    Connected as:
                  </p>
                  <div className="space-y-1 text-sm text-blue-700">
                    <p>
                      <strong>Name:</strong> {userInfo.name}
                    </p>
                    <p>
                      <strong>Username:</strong> {userInfo.username}
                    </p>
                    <p>
                      <strong>Email:</strong> {userInfo.email}
                    </p>
                    {gitlabVersion && (
                      <p>
                        <strong>GitLab Version:</strong> {gitlabVersion}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleTestConnection}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Testing...
                </span>
              ) : (
                "Test Connection"
              )}
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Projects List */}
      {projects.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <h3 className="text-lg font-semibold">
              Available Projects ({projects.length})
            </h3>
          </div>
          <div className="p-4">
            <ul className="space-y-2 max-h-64 overflow-auto">
              {projects.map((project) => (
                <li
                  key={project.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div>
                    <p className="font-medium text-gray-800">{project.name}</p>
                    <p className="text-xs text-gray-500">
                      {project.path_with_namespace}
                    </p>
                  </div>
                  <a
                    href={project.web_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline text-sm"
                  >
                    View
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">How to Get a PAT</h3>
        </div>
        <div className="p-4 text-sm text-gray-600 space-y-2">
          <p>1. Go to your GitLab instance → User Settings → Access Tokens</p>
          <p>
            2. Create a token with <code>read_api</code> and{" "}
            <code>read_repository</code> scopes
          </p>
          <p>3. Copy the token and paste it above</p>
        </div>
      </div>

      {/* Common Errors Help */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Common Connection Issues</h3>
        </div>
        <div className="p-4 text-sm space-y-3">
          <div className="flex gap-2">
            <span>🔐</span>
            <div>
              <p className="font-medium text-gray-800">Unauthorized (401)</p>
              <p className="text-gray-600">
                Token is invalid, expired, or revoked. Create a new PAT.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <span>🚫</span>
            <div>
              <p className="font-medium text-gray-800">Forbidden (403)</p>
              <p className="text-gray-600">
                Token lacks required scopes. Add read_api and read_repository.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <span>🔍</span>
            <div>
              <p className="font-medium text-gray-800">Not Found (404)</p>
              <p className="text-gray-600">
                Wrong URL or API version. Use full URL like https://gitlab.com.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <span>🌐</span>
            <div>
              <p className="font-medium text-gray-800">Network Error</p>
              <p className="text-gray-600">
                Server unreachable. Check firewall, proxy, or server status.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Debug Mode Notice */}
      {isDebugMode() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔧</span>
            <div>
              <p className="font-medium text-yellow-800">Debug Mode Active</p>
              <p className="text-sm text-yellow-600">
                Full error details, stack traces, and raw API responses will be
                displayed. Go to Settings to disable.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}