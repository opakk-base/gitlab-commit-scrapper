import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  getLLMConfig,
  getLLMSummary,
  saveLLMSummary,
  clearLLMSummary,
  generateCommitSummary,
  CommitForSummary,
  LLMSummary,
} from "../services/llm";
import {
  getScrapedCommits,
  getCustomPrompt,
  saveCustomPrompt,
  clearCustomPrompt,
  getDefaultCustomPrompt,
  CommitWithProject,
} from "../services/scraper";
import { isDebugMode } from "../services/settings";
import {
  exportSummaryAsText,
  exportSummaryAsCSV,
  exportSummaryAsPDF,
  exportSummaryAsDOCX,
} from "../services/export";

export default function CommitSummary() {
  const navigate = useNavigate();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [commits, setCommits] = useState<CommitWithProject[]>([]);
  const [existingSummary, setExistingSummary] = useState<LLMSummary | null>(null);
  const [customPrompt, setCustomPrompt] = useState(getCustomPrompt());
  const [showPromptEditor, setShowPromptEditor] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  useEffect(() => {
    const scrapedCommits = getScrapedCommits();
    setCommits(scrapedCommits);
    const summary = getLLMSummary();
    setExistingSummary(summary);
  }, []);

  const handleGenerateSummary = async () => {
    const config = getLLMConfig();
    if (!config.apiKey || !config.model) {
      setError("Please configure your LLM settings first. Go to LLM Settings to set up your API.");
      return;
    }

    if (commits.length === 0) {
      setError("No commits to summarize. Please scrape commits first.");
      return;
    }

    setLoading(true);
    setError(null);
    setRawResponse(null);

    try {
      const commitsForSummary: CommitForSummary[] = commits.map((c) => ({
        title: c.title,
        message: c.message || c.title,
        author: c.author_name,
        project: c.projectName,
        branch: c.branch || "main",
        date: new Date(c.created_at).toLocaleDateString(),
        sha: c.short_id,
        diffs: c.diffs?.map((d) => ({
          old_path: d.old_path,
          new_path: d.new_path,
          new_file: d.new_file,
          renamed_file: d.renamed_file,
          deleted_file: d.deleted_file,
        })),
      }));

      const response = await generateCommitSummary(
        config,
        commitsForSummary,
        customPrompt.systemPrompt,
        customPrompt.userPromptTemplate
      );
      setRawResponse(response);

      const summary: LLMSummary = {
        summary: response,
        keyPoints: [],
        topContributors: [],
        projectBreakdown: [],
        generatedAt: new Date().toISOString(),
        modelUsed: config.model,
        totalCommits: commits.length,
        promptUsed: customPrompt.userPromptTemplate.substring(0, 200) + "...",
      };

      saveLLMSummary(summary);
      setExistingSummary(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSummary = () => {
    clearLLMSummary();
    setExistingSummary(null);
    setRawResponse(null);
  };

  const handleResetPrompt = () => {
    const defaultPrompt = getDefaultCustomPrompt();
    setCustomPrompt(defaultPrompt);
    saveCustomPrompt(defaultPrompt);
  };

  const handleSavePrompt = () => {
    saveCustomPrompt(customPrompt);
    setShowPromptEditor(false);
  };

  // Export handlers
  const handleExport = async (format: "txt" | "csv" | "pdf" | "docx") => {
    if (!existingSummary) return;

    setExporting(format);
    setShowExportMenu(false);

    const filename = `gitlab-commit-summary-${new Date().toISOString().split("T")[0]}`;

    try {
      switch (format) {
        case "txt":
          exportSummaryAsText(existingSummary, filename);
          break;
        case "csv":
          exportSummaryAsCSV(existingSummary, filename);
          break;
        case "pdf":
          await exportSummaryAsPDF(existingSummary, filename);
          break;
        case "docx":
          await exportSummaryAsDOCX(existingSummary, filename);
          break;
      }
    } catch (err) {
      console.error("Export failed:", err);
      setError(`Failed to export as ${format.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  // Calculate stats from commits
  const getCommitStats = () => {
    const contributors = new Map<string, number>();
    const projects = new Map<string, number>();
    const filesChanged = new Set<string>();

    commits.forEach((c) => {
      contributors.set(c.author_name, (contributors.get(c.author_name) || 0) + 1);
      projects.set(c.projectName, (projects.get(c.projectName) || 0) + 1);
      c.diffs?.forEach((d) => {
        filesChanged.add(d.new_path || d.old_path);
      });
    });

    return {
      totalCommits: commits.length,
      uniqueContributors: contributors.size,
      uniqueProjects: projects.size,
      filesWithChanges: filesChanged.size,
      topContributors: Array.from(contributors.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
    };
  };

  const stats = getCommitStats();

  if (commits.length === 0) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-700">
            No commits to summarize. Go to{" "}
            <button
              onClick={() => navigate("/commits")}
              className="underline font-medium text-yellow-800 hover:text-yellow-900"
            >
              Commit Scraper
            </button>{" "}
            to scrape commits first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              AI Commit Summary
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {commits.length} commits available • {stats.filesWithChanges} files changed • {stats.uniqueContributors} contributors
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPromptEditor(!showPromptEditor)}
              className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              ✏️ Edit Prompt
            </button>
            {existingSummary && (
              <>
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={!!exporting}
                    className="px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm disabled:opacity-50"
                  >
                    {exporting ? `Exporting ${exporting.toUpperCase()}...` : "📥 Export"}
                  </button>
                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-10">
                      <div className="py-1">
                        <button
                          onClick={() => handleExport("txt")}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          📄 Export as Text (.txt)
                        </button>
                        <button
                          onClick={() => handleExport("csv")}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          📊 Export as CSV (.csv)
                        </button>
                        <button
                          onClick={() => handleExport("pdf")}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          📑 Export as PDF (.pdf)
                        </button>
                        <button
                          onClick={() => handleExport("docx")}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          📝 Export as Word (.docx)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleClearSummary}
                  className="px-3 py-1.5 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                >
                  Clear
                </button>
              </>
            )}
            <button
              onClick={handleGenerateSummary}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm disabled:opacity-50"
            >
              {loading ? "Generating..." : existingSummary ? "Regenerate" : "Generate Summary"}
            </button>
          </div>
        </div>
      </div>

      {/* Prompt Editor */}
      {showPromptEditor && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">Custom Prompt</h3>
            <div className="flex gap-2">
              <button
                onClick={handleResetPrompt}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Reset to Default
              </button>
              <button
                onClick={() => setShowPromptEditor(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePrompt}
                className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
              >
                Save Prompt
              </button>
            </div>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Prompt
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Defines the AI's role and behavior
              </p>
              <textarea
                value={customPrompt.systemPrompt}
                onChange={(e) =>
                  setCustomPrompt((prev) => ({ ...prev, systemPrompt: e.target.value }))
                }
                rows={6}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Prompt Template
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Use {"{{commitCount}}"} and {"{{commits}}"} as placeholders. The AI will respond in Markdown format.
              </p>
              <textarea
                value={customPrompt.userPromptTemplate}
                onChange={(e) =>
                  setCustomPrompt((prev) => ({ ...prev, userPromptTemplate: e.target.value }))
                }
                rows={12}
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-2xl font-bold text-blue-600">{stats.totalCommits}</p>
          <p className="text-sm text-gray-500">Total Commits</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-2xl font-bold text-green-600">{stats.uniqueContributors}</p>
          <p className="text-sm text-gray-500">Contributors</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-2xl font-bold text-purple-600">{stats.uniqueProjects}</p>
          <p className="text-sm text-gray-500">Projects</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-2xl font-bold text-orange-600">{stats.filesWithChanges}</p>
          <p className="text-sm text-gray-500">Files Changed</p>
        </div>
      </div>

      {/* Top Contributors Preview */}
      {stats.topContributors.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-medium text-gray-800 mb-2">Top Contributors</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topContributors.map(({ name, count }) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm"
              >
                {name} <span className="text-blue-500">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="animate-spin text-xl">⏳</span>
            <div>
              <p className="text-blue-700 font-medium">Generating summary...</p>
              <p className="text-sm text-blue-600">
                Analyzing {commits.length} commits with {stats.filesWithChanges} file changes.
                This may take a moment.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">❌</span>
            <div>
              <p className="font-medium text-red-800">Error generating summary</p>
              <p className="text-sm text-red-600 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Results */}
      {existingSummary && !loading && (
        <>
          {/* Main Summary - Markdown Rendered */}
          <div className="bg-white rounded-lg shadow" ref={summaryRef} id="summary-content">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Summary</h3>
                <div className="text-sm text-gray-500">
                  Generated by {existingSummary.modelUsed} •{" "}
                  {new Date(existingSummary.generatedAt).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold text-gray-900 mt-6 mb-4 first:mt-0">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-bold text-gray-800 mt-5 mb-3 first:mt-0">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2 first:mt-0">{children}</h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-base font-semibold text-gray-700 mt-3 mb-2">{children}</h4>
                    ),
                    p: ({ children }) => (
                      <p className="text-gray-700 leading-relaxed mb-3">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside text-gray-700 space-y-1 mb-3 ml-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside text-gray-700 space-y-1 mb-3 ml-2">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-gray-700">{children}</li>
                    ),
                    code: ({ className, children }) => {
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono">
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code className="block bg-gray-100 text-gray-800 p-3 rounded text-sm font-mono overflow-x-auto">
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-gray-100 rounded-lg p-3 overflow-x-auto mb-3">{children}</pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-600 my-3">
                        {children}
                      </blockquote>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-gray-900">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-gray-700">{children}</em>
                    ),
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {children}
                      </a>
                    ),
                    hr: () => <hr className="border-gray-200 my-4" />,
                    table: ({ children }) => (
                      <div className="overflow-x-auto mb-3">
                        <table className="min-w-full border-collapse border border-gray-200">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-gray-50">{children}</thead>
                    ),
                    th: ({ children }) => (
                      <th className="border border-gray-200 px-3 py-2 text-left font-semibold text-gray-700">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-gray-200 px-3 py-2 text-gray-700">{children}</td>
                    ),
                  }}
                >
                  {existingSummary.summary}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-800 mb-2">Analysis Info</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>
                • <strong>{existingSummary.totalCommits}</strong> commits analyzed
              </li>
              <li>
                • Model used: <strong>{existingSummary.modelUsed}</strong>
              </li>
              <li>
                • Generated at:{" "}
                <strong>
                  {new Date(existingSummary.generatedAt).toLocaleString()}
                </strong>
              </li>
            </ul>
          </div>
        </>
      )}

      {/* No Summary Yet */}
      {!existingSummary && !loading && !error && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            Ready to Generate Summary
          </h3>
          <p className="text-gray-600 mb-4">
            Click "Generate Summary" to analyze your {commits.length} commits with{" "}
            {stats.filesWithChanges} file changes using AI.
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setShowPromptEditor(true)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Customize Prompt
            </button>
            <button
              onClick={handleGenerateSummary}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Generate Summary
            </button>
          </div>
        </div>
      )}

      {/* Debug: Raw Response */}
      {isDebugMode() && rawResponse && (
        <div className="bg-gray-100 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">Raw API Response (Debug)</h3>
          <pre className="text-xs text-gray-600 overflow-auto whitespace-pre-wrap max-h-96">
            {rawResponse}
          </pre>
        </div>
      )}

      {/* Debug Info */}
      {isDebugMode() && (
        <div className="bg-gray-100 rounded-lg p-4">
          <h3 className="font-medium text-gray-800 mb-2">Debug Info</h3>
          <pre className="text-xs text-gray-600 overflow-auto">
            {JSON.stringify(
              {
                commitsCount: commits.length,
                stats,
                hasSummary: !!existingSummary,
                customPromptLength: {
                  system: customPrompt.systemPrompt.length,
                  user: customPrompt.userPromptTemplate.length,
                },
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