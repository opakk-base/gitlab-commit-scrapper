import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getScrapedCommits,
  getScraperConfig,
  clearScrapedCommits,
  CommitWithProject,
} from "../services/scraper";
import { isDebugMode } from "../services/settings";

export default function ScrapeResults() {
  const navigate = useNavigate();
  const [commits, setCommits] = useState<CommitWithProject[]>([]);
  const [config, setConfig] = useState<{
    projectIds: number[];
    sinceDate: string;
    untilDate: string;
    branch: string;
    includeDiffs?: boolean;
    scrapedAt: string;
  } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const storedCommits = getScrapedCommits();
    const storedConfig = getScraperConfig();
    setCommits(storedCommits);
    setConfig(storedConfig);
  }, []);

  // Get unique projects, authors, and branches for filters
  const uniqueProjects = useMemo(() => {
    const projects = new Set(commits.map((c) => c.projectName));
    return Array.from(projects).sort();
  }, [commits]);

  const uniqueAuthors = useMemo(() => {
    const authors = new Set(commits.map((c) => c.author_name));
    return Array.from(authors).sort();
  }, [commits]);

  const uniqueBranches = useMemo(() => {
    const branches = new Set(commits.map((c) => c.branch).filter(Boolean));
    return Array.from(branches).sort();
  }, [commits]);

  const filesChangedCount = useMemo(() => {
    const files = new Set<string>();
    commits.forEach((c) => {
      c.diffs?.forEach((d) => {
        files.add(d.new_path || d.old_path);
      });
    });
    return files.size;
  }, [commits]);

  // Filtered and sorted commits
  const filteredCommits = useMemo(() => {
    let result = [...commits];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          c.author_name.toLowerCase().includes(query) ||
          c.short_id.toLowerCase().includes(query) ||
          c.projectName.toLowerCase().includes(query) ||
          c.branch?.toLowerCase().includes(query)
      );
    }

    // Filter by project
    if (selectedProject !== "all") {
      result = result.filter((c) => c.projectName === selectedProject);
    }

    // Filter by author
    if (selectedAuthor !== "all") {
      result = result.filter((c) => c.author_name === selectedAuthor);
    }

    // Filter by branch
    if (selectedBranch !== "all") {
      result = result.filter((c) => c.branch === selectedBranch);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;

      switch (sortField) {
        case "created_at":
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
          break;
        case "author_name":
          aVal = a.author_name.toLowerCase();
          bVal = b.author_name.toLowerCase();
          break;
        case "projectName":
          aVal = a.projectName.toLowerCase();
          bVal = b.projectName.toLowerCase();
          break;
        case "branch":
          aVal = (a.branch || "").toLowerCase();
          bVal = (b.branch || "").toLowerCase();
          break;
        case "title":
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        default:
          aVal = new Date(a.created_at).getTime();
          bVal = new Date(b.created_at).getTime();
      }

      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    commits,
    searchQuery,
    selectedProject,
    selectedAuthor,
    selectedBranch,
    sortField,
    sortDirection,
  ]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleExportCSV = () => {
    const hasDiffs = commits.some((c) => c.diffs && c.diffs.length > 0);
    const headers = ["Project", "Branch", "Author", "Commit ID", "Title", "Date", "URL", hasDiffs ? "Files Changed" : ""].filter(Boolean);
    const rows = filteredCommits.map((c) => {
      const row = [
        c.projectName,
        c.branch || "",
        c.author_name,
        c.short_id,
        c.title,
        new Date(c.created_at).toISOString(),
        c.web_url,
      ];
      if (hasDiffs) {
        const files = c.diffs?.map((d) => d.new_path || d.old_path).join("; ") || "";
        row.push(files);
      }
      return row;
    });

    const csvContent =
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${cell}"`).join(","))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gitlab-commits-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearAndNewScrape = () => {
    clearScrapedCommits();
    navigate("/commits");
  };

  const handleSummarize = () => {
    navigate("/commits/summary");
  };

  if (commits.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700">
            No scraped commits found. Go to{" "}
            <button
              onClick={() => navigate("/commits")}
              className="underline font-medium text-yellow-800 hover:text-yellow-900"
            >
              Commit Scraper
            </button>{" "}
            to scrape commits from GitLab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Scraped Commits
            </h2>
            {config && (
              <p className="text-sm text-gray-500 mt-1">
                Scraped at: {new Date(config.scrapedAt).toLocaleString()}
                {config.branch && ` | Branch: ${config.branch}`}
                {config.sinceDate && ` | Since: ${config.sinceDate}`}
                {config.untilDate && ` | Until: ${config.untilDate}`}
                {config.includeDiffs !== undefined && ` | Diffs: ${config.includeDiffs ? "Yes" : "No"}`}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
            >
              Export CSV
            </button>
            <button
              onClick={handleSummarize}
              className="px-3 py-1.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
            >
              🤖 AI Summary
            </button>
            <button
              onClick={handleClearAndNewScrape}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
            >
              New Scrape
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div className="bg-blue-50 px-3 py-1.5 rounded">
            <span className="text-blue-600 font-medium">{commits.length}</span>
            <span className="text-blue-500 ml-1">total commits</span>
          </div>
          <div className="bg-purple-50 px-3 py-1.5 rounded">
            <span className="text-purple-600 font-medium">
              {uniqueProjects.length}
            </span>
            <span className="text-purple-500 ml-1">projects</span>
          </div>
          <div className="bg-green-50 px-3 py-1.5 rounded">
            <span className="text-green-600 font-medium">
              {uniqueAuthors.length}
            </span>
            <span className="text-green-500 ml-1">authors</span>
          </div>
          <div className="bg-indigo-50 px-3 py-1.5 rounded">
            <span className="text-indigo-600 font-medium">
              {uniqueBranches.length}
            </span>
            <span className="text-indigo-500 ml-1">branches</span>
          </div>
          {filesChangedCount > 0 && (
            <div className="bg-teal-50 px-3 py-1.5 rounded">
              <span className="text-teal-600 font-medium">
                {filesChangedCount}
              </span>
              <span className="text-teal-500 ml-1">files changed</span>
            </div>
          )}
          <div className="bg-orange-50 px-3 py-1.5 rounded">
            <span className="text-orange-600 font-medium">
              {filteredCommits.length}
            </span>
            <span className="text-orange-500 ml-1">filtered</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, branch, commit ID..."
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Project filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Projects</option>
              {uniqueProjects.map((project) => (
                <option key={project} value={project}>
                  {project}
                </option>
              ))}
            </select>
          </div>

          {/* Branch filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Branches</option>
              {uniqueBranches.map((branch) => (
                <option key={branch} value={branch}>
                  {branch}
                </option>
              ))}
            </select>
          </div>

          {/* Author filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Author
            </label>
            <select
              value={selectedAuthor}
              onChange={(e) => setSelectedAuthor(e.target.value)}
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Authors</option>
              {uniqueAuthors.map((author) => (
                <option key={author} value={author}>
                  {author}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th
                  className="p-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort("projectName")}
                >
                  <div className="flex items-center gap-1">
                    Project
                    {sortField === "projectName" && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th
                  className="p-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort("branch")}
                >
                  <div className="flex items-center gap-1">
                    Branch
                    {sortField === "branch" && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th
                  className="p-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort("author_name")}
                >
                  <div className="flex items-center gap-1">
                    Author
                    {sortField === "author_name" && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="p-3 text-left font-medium text-gray-600">
                  Commit
                </th>
                <th
                  className="p-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort("title")}
                >
                  <div className="flex items-center gap-1">
                    Title
                    {sortField === "title" && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th
                  className="p-3 text-left font-medium text-gray-600 cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleSort("created_at")}
                >
                  <div className="flex items-center gap-1">
                    Date
                    {sortField === "created_at" && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredCommits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    No commits match your filters
                  </td>
                </tr>
              ) : (
                filteredCommits.map((commit) => (
                  <tr key={commit.id} className="hover:bg-gray-50">
                    <td className="p-3 text-gray-800 max-w-xs truncate">
                      {commit.projectName}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700">
                        {commit.branch || "N/A"}
                      </span>
                    </td>
                    <td className="p-3 text-gray-600">{commit.author_name}</td>
                    <td className="p-3">
                      <a
                        href={commit.web_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-500 hover:underline font-mono"
                      >
                        {commit.short_id}
                      </a>
                    </td>
                    <td className="p-3 text-gray-600 max-w-md truncate">
                      {commit.title}
                    </td>
                    <td className="p-3 text-gray-500">
                      {new Date(commit.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination info */}
        <div className="p-3 bg-gray-50 text-sm text-gray-500">
          Showing {filteredCommits.length} of {commits.length} commits
        </div>
      </div>

      {/* Debug info */}
      {isDebugMode() && (
        <div className="bg-gray-100 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">Debug Info</h3>
          <pre className="text-xs text-gray-600 overflow-auto">
            {JSON.stringify(
              {
                totalCommits: commits.length,
                filteredCommits: filteredCommits.length,
                projects: uniqueProjects.length,
                authors: uniqueAuthors.length,
                branches: uniqueBranches.length,
                filesChanged: filesChangedCount,
                config,
              },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}