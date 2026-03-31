import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  getScrapedCommits,
  getScraperConfig,
  clearScrapedCommits,
  CommitWithProject,
} from "../services/scraper";
import { isDebugMode } from "../services/settings";
import ErrorDisplay from "../components/ErrorDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GitLabError } from "../services/gitlab";
import NewScrapeDialog from "../components/NewScrapeDialog";
import {
  Plus,
  Download,
  Sparkles,
  GitBranch,
} from "lucide-react";

export default function Commits() {
  const navigate = useNavigate();
  const [commits, setCommits] = useState<CommitWithProject[]>([]);
  const [scraperConfig, setScraperConfig] = useState<{
    projectIds: number[];
    sinceDate: string;
    untilDate: string;
    branch: string;
    includeDiffs?: boolean;
    scrapedAt: string;
  } | null>(null);

  // Filters for results table
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState<string>("all");
  const [selectedAuthor, setSelectedAuthor] = useState<string>("all");
  const [selectedBranch, setSelectedBranch] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("created_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // New Scrape Dialog state
  const [showNewScrapeDialog, setShowNewScrapeDialog] = useState(false);
  const [error, setError] = useState<GitLabError | null>(null);

  // Load commits on mount
  useEffect(() => {
    loadCommits();
  }, []);

  const loadCommits = () => {
    const storedCommits = getScrapedCommits();
    const storedConfig = getScraperConfig();
    setCommits(storedCommits);
    setScraperConfig(storedConfig);
  };

  // Get unique values for filters
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

    if (selectedProject !== "all") {
      result = result.filter((c) => c.projectName === selectedProject);
    }

    if (selectedAuthor !== "all") {
      result = result.filter((c) => c.author_name === selectedAuthor);
    }

    if (selectedBranch !== "all") {
      result = result.filter((c) => c.branch === selectedBranch);
    }

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

  // Export CSV
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

  const handleSummarize = () => {
    navigate("/commits/summary");
  };

  const handleClearCommits = () => {
    clearScrapedCommits();
    setCommits([]);
    setScraperConfig(null);
  };

  // Empty state
  if (commits.length === 0) {
    return (
      <div className="space-y-6">
        {/* Error Display */}
        {error && <ErrorDisplay error={error} />}

        {/* Empty State */}
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <GitBranch className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            No Commits Scraped Yet
          </h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Start by scraping commits from your GitLab projects. You can filter by branch, date range, and include file change details.
          </p>
          <Button onClick={() => setShowNewScrapeDialog(true)} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            New Scrape
          </Button>
        </div>

        {/* New Scrape Dialog */}
        <NewScrapeDialog
          open={showNewScrapeDialog}
          onOpenChange={setShowNewScrapeDialog}
          onComplete={loadCommits}
          onError={setError}
        />
      </div>
    );
  }

  // Results view
  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && <ErrorDisplay error={error} />}

      {/* Header with stats */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Scraped Commits
            </h2>
            {scraperConfig && (
              <p className="text-sm text-muted-foreground mt-1">
                Scraped at: {new Date(scraperConfig.scrapedAt).toLocaleString()}
                {scraperConfig.branch && ` | Branch: ${scraperConfig.branch}`}
                {scraperConfig.sinceDate && ` | Since: ${scraperConfig.sinceDate}`}
                {scraperConfig.untilDate && ` | Until: ${scraperConfig.untilDate}`}
                {scraperConfig.includeDiffs !== undefined && ` | Diffs: ${scraperConfig.includeDiffs ? "Yes" : "No"}`}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button onClick={handleSummarize}>
              <Sparkles className="h-4 w-4 mr-2" />
              AI Summary
            </Button>
            <Button variant="outline" onClick={() => setShowNewScrapeDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Scrape
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap gap-4 mt-4 text-sm">
          <div className="bg-primary/10 px-3 py-1.5 rounded">
            <span className="text-primary font-medium">{commits.length}</span>
            <span className="text-primary/70 ml-1">total commits</span>
          </div>
          <div className="bg-purple-500/10 px-3 py-1.5 rounded">
            <span className="text-purple-600 font-medium">{uniqueProjects.length}</span>
            <span className="text-purple-500/70 ml-1">projects</span>
          </div>
          <div className="bg-green-500/10 px-3 py-1.5 rounded">
            <span className="text-green-600 font-medium">{uniqueAuthors.length}</span>
            <span className="text-green-500/70 ml-1">authors</span>
          </div>
          <div className="bg-indigo-500/10 px-3 py-1.5 rounded">
            <span className="text-indigo-600 font-medium">{uniqueBranches.length}</span>
            <span className="text-indigo-500/70 ml-1">branches</span>
          </div>
          {filesChangedCount > 0 && (
            <div className="bg-teal-500/10 px-3 py-1.5 rounded">
              <span className="text-teal-600 font-medium">{filesChangedCount}</span>
              <span className="text-teal-500/70 ml-1">files changed</span>
            </div>
          )}
          <div className="bg-orange-500/10 px-3 py-1.5 rounded">
            <span className="text-orange-600 font-medium">{filteredCommits.length}</span>
            <span className="text-orange-500/70 ml-1">filtered</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2 space-y-2">
            <Label>Search</Label>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, author, branch, commit ID..."
            />
          </div>

          {/* Project filter */}
          <div className="space-y-2">
            <Label>Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger>
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {uniqueProjects.map((project) => (
                  <SelectItem key={project} value={project}>
                    {project}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Branch filter */}
          <div className="space-y-2">
            <Label>Branch</Label>
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger>
                <SelectValue placeholder="All Branches" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {uniqueBranches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Author filter */}
          <div className="space-y-2">
            <Label>Author</Label>
            <Select value={selectedAuthor} onValueChange={setSelectedAuthor}>
              <SelectTrigger>
                <SelectValue placeholder="All Authors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Authors</SelectItem>
                {uniqueAuthors.map((author) => (
                  <SelectItem key={author} value={author}>
                    {author}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th
                  className="p-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted"
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
                  className="p-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted"
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
                  className="p-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted"
                  onClick={() => toggleSort("author_name")}
                >
                  <div className="flex items-center gap-1">
                    Author
                    {sortField === "author_name" && (
                      <span>{sortDirection === "asc" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </th>
                <th className="p-3 text-left font-medium text-muted-foreground">
                  Commit
                </th>
                <th
                  className="p-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted"
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
                  className="p-3 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted"
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
            <tbody className="divide-y divide-border">
              {filteredCommits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-muted-foreground">
                    No commits match your filters
                  </td>
                </tr>
              ) : (
                filteredCommits.map((commit) => (
                  <tr key={commit.id} className="hover:bg-muted/50">
                    <td className="p-3 text-foreground max-w-xs truncate">
                      {commit.projectName}
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                        {commit.branch || "N/A"}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">{commit.author_name}</td>
                    <td className="p-3">
                      <a
                        href={commit.web_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-mono"
                      >
                        {commit.short_id}
                      </a>
                    </td>
                    <td className="p-3 text-muted-foreground max-w-md truncate">
                      {commit.title}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {new Date(commit.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-muted/50 text-sm text-muted-foreground">
          Showing {filteredCommits.length} of {commits.length} commits
        </div>
      </div>

      {/* Debug info */}
      {isDebugMode() && (
        <div className="bg-muted rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-2">Debug Info</h3>
          <pre className="text-xs text-muted-foreground overflow-auto">
            {JSON.stringify(
              {
                totalCommits: commits.length,
                filteredCommits: filteredCommits.length,
                projects: uniqueProjects.length,
                authors: uniqueAuthors.length,
                branches: uniqueBranches.length,
                filesChanged: filesChangedCount,
                scraperConfig,
              },
              null,
              2
            )}
          </pre>
        </div>
      )}

      {/* New Scrape Dialog */}
      <NewScrapeDialog
        open={showNewScrapeDialog}
        onOpenChange={setShowNewScrapeDialog}
        onComplete={loadCommits}
        onError={setError}
      />
    </div>
  );
}