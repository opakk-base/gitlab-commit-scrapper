import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  GitLabConfig,
  getGitLabConfig,
  fetchProjects,
  fetchBranches,
  fetchCommitsWithDiffs,
  GitLabProject,
  GitLabBranch,
  GitLabApiError,
  GitLabError,
} from "../services/gitlab";
import {
  saveScrapedCommits,
  saveScraperConfig,
  CommitWithProject,
} from "../services/scraper";
import { isDebugMode } from "../services/settings";
import ErrorDisplay from "../components/ErrorDisplay";

export default function CommitScraper() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<GitLabConfig | null>(null);
  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<Set<number>>(
    new Set()
  );
  const [sinceDate, setSinceDate] = useState<string>("");
  const [untilDate, setUntilDate] = useState<string>("");
  const [branch, setBranch] = useState<string>("");
  const [includeDiffs, setIncludeDiffs] = useState<boolean>(true);
  const [maxCommits, setMaxCommits] = useState<number>(50);
  const [projectBranches, setProjectBranches] = useState<Map<number, GitLabBranch[]>>(new Map());
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [error, setError] = useState<GitLabError | null>(null);
  const [rawError, setRawError] = useState<unknown>(null);
  const [scrapeProgress, setScrapeProgress] = useState<string>("");

  useEffect(() => {
    const storedConfig = getGitLabConfig();
    if (storedConfig) {
      setConfig(storedConfig);
      loadProjects(storedConfig);
    }
  }, []);

  // Load branches when projects are selected
  useEffect(() => {
    if (config && selectedProjects.size > 0) {
      loadBranchesForSelectedProjects();
    }
  }, [selectedProjects, config]);

  const loadProjects = async (gitlabConfig: GitLabConfig) => {
    setLoading(true);
    setError(null);
    setRawError(null);
    try {
      const fetchedProjects = await fetchProjects(gitlabConfig);
      setProjects(fetchedProjects);
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
          message: "Failed to load projects",
          suggestion: "Check your GitLab configuration and try again.",
          details: isDebugMode() ? JSON.stringify(err, null, 2) : undefined,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const loadBranchesForSelectedProjects = async () => {
    if (!config) return;

    setLoadingBranches(true);
    const newBranches = new Map<number, GitLabBranch[]>();

    try {
      await Promise.all(
        Array.from(selectedProjects).map(async (projectId) => {
          try {
            const branches = await fetchBranches(config, projectId);
            newBranches.set(projectId, branches);
          } catch (err) {
            console.error(`Failed to load branches for project ${projectId}:`, err);
            newBranches.set(projectId, []);
          }
        })
      );

      setProjectBranches(newBranches);
    } finally {
      setLoadingBranches(false);
    }
  };

  // Get unique branch names across all selected projects
  const getCommonBranches = (): string[] => {
    if (selectedProjects.size === 0) return [];

    const allBranchNames = new Set<string>();
    projectBranches.forEach((branches) => {
      branches.forEach((b) => allBranchNames.add(b.name));
    });

    return Array.from(allBranchNames).sort();
  };

  // Check if a branch exists in all selected projects
  const branchExistsInAllProjects = (branchName: string): boolean => {
    if (selectedProjects.size === 0) return false;

    for (const projectId of selectedProjects) {
      const branches = projectBranches.get(projectId) || [];
      if (!branches.some((b) => b.name === branchName)) {
        return false;
      }
    }
    return true;
  };

  const toggleProject = (projectId: number) => {
    setSelectedProjects((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  };

  const toggleAllProjects = () => {
    if (selectedProjects.size === projects.length) {
      setSelectedProjects(new Set());
    } else {
      setSelectedProjects(new Set(projects.map((p) => p.id)));
    }
  };

  const scrapeCommits = async () => {
    if (!config || selectedProjects.size === 0) return;

    setScraping(true);
    setError(null);
    setRawError(null);
    setScrapeProgress("Starting scrape...");

    try {
      const projectIds = Array.from(selectedProjects);
      const allCommits: CommitWithProject[] = [];
      let totalCommitsProcessed = 0;

      // Scrape commits project by project
      for (let i = 0; i < projectIds.length; i++) {
        const projectId = projectIds[i];
        const project = projects.find((p) => p.id === projectId);
        const projectBranchList = projectBranches.get(projectId) || [];

        // Determine which branch to use for this project
        let branchToUse = branch;
        if (branch && !projectBranchList.some((b) => b.name === branch)) {
          const defaultBranch = projectBranchList.find((b) => b.default);
          branchToUse = defaultBranch?.name || "";
        }

        setScrapeProgress(
          `Scraping project ${i + 1}/${projectIds.length}: ${project?.name || projectId}${includeDiffs ? " (with diffs)" : ""}`
        );

        try {
          // Use the new function that fetches with diffs
          const commitsWithDiffs = await fetchCommitsWithDiffs(
            config,
            projectId,
            project?.path_with_namespace || String(projectId),
            sinceDate,
            untilDate,
            branchToUse || undefined,
            maxCommits
          );

          commitsWithDiffs.forEach((cwd) => {
            allCommits.push({
              ...cwd.commit,
              projectId,
              projectName: project?.path_with_namespace || String(projectId),
              branch: branchToUse || "all",
              diffs: includeDiffs ? cwd.diffs : undefined,
            });
            totalCommitsProcessed++;
          });

          setScrapeProgress(
            `Found ${totalCommitsProcessed} commits from ${i + 1}/${projectIds.length} projects...`
          );
        } catch (err) {
          console.error(`Failed to scrape project ${projectId}:`, err);
        }
      }

      // Sort by created_at descending
      allCommits.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setScrapeProgress(`Found ${allCommits.length} commits. Saving...`);

      // Save to storage
      saveScrapedCommits(allCommits);
      saveScraperConfig({
        projectIds,
        sinceDate,
        untilDate,
        branch,
        includeDiffs,
        scrapedAt: new Date().toISOString(),
      });

      setScrapeProgress("Done! Redirecting to results...");

      // Navigate to results page
      setTimeout(() => {
        navigate("/commits/results");
      }, 500);
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
          message: "Failed to scrape commits",
          suggestion: "Check your GitLab configuration and try again.",
          details: isDebugMode() ? JSON.stringify(err, null, 2) : undefined,
        });
      }
    } finally {
      setScraping(false);
    }
  };

  const handleViewResults = () => {
    navigate("/commits/results");
  };

  if (!config) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
        <p>
          Please configure your GitLab settings first. Go to{" "}
          <a href="/gitlab-settings" className="underline font-medium">
            GitLab Settings
          </a>{" "}
          to set up your connection.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading projects...</div>
      </div>
    );
  }

  const commonBranches = getCommonBranches();

  return (
    <div className="space-y-6">
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

      {/* Project Selection */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Select Projects</h3>
          <button
            onClick={toggleAllProjects}
            className="text-sm text-blue-500 hover:underline"
          >
            {selectedProjects.size === projects.length
              ? "Deselect All"
              : "Select All"}
          </button>
        </div>
        <div className="p-4">
          {projects.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No projects found. Check your GitLab configuration or permissions.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-auto">
                {projects.map((project) => (
                  <label
                    key={project.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedProjects.has(project.id)
                        ? "bg-blue-50 border border-blue-200"
                        : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProjects.has(project.id)}
                      onChange={() => toggleProject(project.id)}
                      className="w-4 h-4 text-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {project.path_with_namespace}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {selectedProjects.size} projects selected
              </p>
            </>
          )}
        </div>
      </div>

      {/* Branch Filter */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Branch Filter</h3>
        </div>
        <div className="p-4">
          {selectedProjects.size === 0 ? (
            <p className="text-sm text-gray-500">
              Select projects first to see available branches.
            </p>
          ) : loadingBranches ? (
            <p className="text-sm text-gray-500">Loading branches...</p>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Branch
                </label>
                <select
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Branches (default branch for each project)</option>
                  {commonBranches.map((branchName) => (
                    <option
                      key={branchName}
                      value={branchName}
                      disabled={!branchExistsInAllProjects(branchName)}
                    >
                      {branchName}
                      {!branchExistsInAllProjects(branchName) && " (not in all projects)"}
                    </option>
                  ))}
                </select>
              </div>
              {branch && !branchExistsInAllProjects(branch) && (
                <p className="text-sm text-yellow-600">
                  ⚠️ This branch doesn't exist in all selected projects. The default
                  branch will be used for projects where this branch is missing.
                </p>
              )}
              <p className="text-xs text-gray-500">
                {commonBranches.length} branches found across selected projects.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Scrape Options */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Scrape Options</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Include Diffs Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Include File Changes (Diffs)</p>
              <p className="text-sm text-gray-500">
                Fetch file change details for better AI summaries. Takes longer but provides more context.
              </p>
            </div>
            <button
              onClick={() => setIncludeDiffs(!includeDiffs)}
              className={`w-12 h-6 rounded-full transition-colors ${
                includeDiffs ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  includeDiffs ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Max Commits per Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Commits per Project
            </label>
            <input
              type="number"
              value={maxCommits}
              onChange={(e) => setMaxCommits(Math.max(1, parseInt(e.target.value) || 50))}
              min={1}
              max={500}
              className="w-32 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Limit commits per project to avoid API rate limits. Max 500.
            </p>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Since Date
              </label>
              <input
                type="date"
                value={sinceDate}
                onChange={(e) => setSinceDate(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Until Date
              </label>
              <input
                type="date"
                value={untilDate}
                onChange={(e) => setUntilDate(e.target.value)}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Scrape Progress */}
      {scraping && scrapeProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="animate-spin text-xl">⏳</span>
            <p className="text-blue-700">{scrapeProgress}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={scrapeCommits}
          disabled={scraping || selectedProjects.size === 0}
          className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {scraping ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              Scraping...
            </span>
          ) : (
            `Scrape Commits (${selectedProjects.size} projects)`
          )}
        </button>
        <button
          onClick={handleViewResults}
          className="px-4 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
        >
          View Results
        </button>
      </div>

      {/* Summary */}
      {!scraping && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2">Scrape Summary</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>
              • <strong>{selectedProjects.size}</strong> projects selected
            </li>
            <li>
              • Branch: <strong>{branch || "All branches"}</strong>
            </li>
            <li>
              • Include diffs: <strong>{includeDiffs ? "Yes" : "No"}</strong>
            </li>
            <li>
              • Max commits per project: <strong>{maxCommits}</strong>
            </li>
            <li>
              • Date range:{" "}
              {sinceDate || untilDate
                ? `${sinceDate || "N/A"} to ${untilDate || "N/A"}`
                : "All commits"}
            </li>
          </ul>
        </div>
      )}

      {/* Debug Mode Notice */}
      {isDebugMode() && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔧</span>
            <div>
              <p className="font-medium text-yellow-800">Debug Mode Active</p>
              <p className="text-sm text-yellow-600">
                Full error details and stack traces will be displayed. Go to
                Settings to disable.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}