import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  getLLMConfig,
  getLLMSummary,
  saveLLMSummary,
  clearLLMSummary,
  generateCommitSummary,
  continueSummaryGeneration,
  savePartialSummary,
  getPartialSummary,
  clearPartialSummary,
  CommitForSummary,
  LLMSummary,
  LLMConfig,
} from "../services/llm";
import {
  getScrapedCommits,
  getCustomPrompt,
  saveCustomPrompt,
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
import { addSummaryHistory, SummaryHistoryItem } from "../services/summaryHistory";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SummarySkeleton from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Pencil, Download, Trash2, Sparkles, RefreshCw, RotateCcw, Bot, FileText, ChevronDown, Check, Play } from "lucide-react";

export default function CommitSummary() {
  const navigate = useNavigate();
  const summaryRef = useRef<HTMLDivElement>(null);
  const [commits, setCommits] = useState<CommitWithProject[]>([]);
  const [existingSummary, setExistingSummary] = useState<LLMSummary | null>(null);
  const [customPrompt, setCustomPrompt] = useState(getCustomPrompt());
  const [tempPrompt, setTempPrompt] = useState(getCustomPrompt());
  const [showPromptDialog, setShowPromptDialog] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);

  // Model selection state
  const [activeConfig, setActiveConfig] = useState<LLMConfig | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);

  // Partial summary state for continue generation
  const [partialSummary, setPartialSummary] = useState<ReturnType<typeof getPartialSummary>>(null);
  const [continuing, setContinuing] = useState(false);

  useEffect(() => {
    const scrapedCommits = getScrapedCommits();
    setCommits(scrapedCommits);
    const summary = getLLMSummary();
    setExistingSummary(summary);

    // Check for partial summary
    const partial = getPartialSummary();
    setPartialSummary(partial);

    // Load active config and models
    const config = getLLMConfig();
    if (config) {
      setActiveConfig(config);
      setSelectedModel(config.model);
      setAvailableModels(config.models || [config.model].filter(Boolean));
    }
  }, []);

  const handleGenerateSummary = async (modelOverride?: string) => {
    const config = getLLMConfig();

    if (!config) {
      setError("Please configure your LLM settings first. Go to LLM Settings to set up your API.");
      return;
    }

    // Check if Ollama (doesn't require API key)
    const isOllama = config.provider === "ollama" || config.apiUrl.includes("ollama") || config.apiUrl.includes("localhost:11434");

    // Determine which model to use
    const modelToUse = modelOverride || selectedModel || config.model;

    if ((!isOllama && !config.apiKey) || !modelToUse) {
      setError("Please configure your LLM settings first. Go to LLM Settings to set up your API and select a model.");
      return;
    }

    if (commits.length === 0) {
      setError("No commits to summarize. Please scrape commits first.");
      return;
    }

    setLoading(true);
    setError(null);
    setRawResponse(null);
    setShowModelMenu(false);

    // Prepare commits for summary
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

    // Save context before API call (for potential continuation)
    savePartialSummary({
      summary: "", // Will be filled on success or error
      modelUsed: modelToUse,
      configId: config.id,
      totalCommits: commits.length,
      generatedAt: new Date().toISOString(),
      systemPrompt: customPrompt.systemPrompt,
      userPromptTemplate: customPrompt.userPromptTemplate,
      commits: commitsForSummary,
    });

    try {
      // Create config with selected model
      const configWithModel = { ...config, model: modelToUse };

      const response = await generateCommitSummary(
        configWithModel,
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
        modelUsed: modelToUse,
        totalCommits: commits.length,
        promptUsed: customPrompt.userPromptTemplate.substring(0, 200) + "...",
      };

      saveLLMSummary(summary);
      setExistingSummary(summary);
      setSelectedModel(modelToUse);

      // Save to history
      addSummaryHistory({
        summary: response,
        modelUsed: modelToUse,
        configName: config.name,
        configId: config.id,
        totalCommits: commits.length,
        generatedAt: new Date().toISOString(),
        projectStats: {
          totalCommits: commits.length,
          uniqueContributors: stats.uniqueContributors,
          uniqueProjects: stats.uniqueProjects,
          filesWithChanges: stats.filesWithChanges,
        },
      });

      // Clear partial summary on success
      clearPartialSummary();
      setPartialSummary(null);
    } catch (err) {
      // Keep the partial summary context for continuation
      const partial = getPartialSummary();
      if (partial) {
        setPartialSummary(partial);
      }
      setError(err instanceof Error ? err.message : "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const handleClearSummary = () => {
    clearLLMSummary();
    setExistingSummary(null);
    setRawResponse(null);
    clearPartialSummary();
    setPartialSummary(null);
  };

  // Continue generation from partial summary
  const handleContinueGeneration = async () => {
    if (!partialSummary) return;

    const config = getLLMConfig();
    if (!config) {
      setError("Please configure your LLM settings first.");
      return;
    }

    setContinuing(true);
    setError(null);

    try {
      // If we have partial content, continue from it; otherwise start fresh
      const response = partialSummary.summary
        ? await continueSummaryGeneration(
            config,
            partialSummary.summary,
            partialSummary.systemPrompt,
            partialSummary.userPromptTemplate,
            partialSummary.commits
          )
        : await generateCommitSummary(
            config,
            partialSummary.commits,
            partialSummary.systemPrompt,
            partialSummary.userPromptTemplate
          );

      const summary: LLMSummary = {
        summary: response,
        keyPoints: [],
        topContributors: [],
        projectBreakdown: [],
        generatedAt: new Date().toISOString(),
        modelUsed: partialSummary.modelUsed,
        totalCommits: partialSummary.totalCommits,
        promptUsed: partialSummary.userPromptTemplate.substring(0, 200) + "...",
      };

      saveLLMSummary(summary);
      setExistingSummary(summary);
      setRawResponse(response);

      // Clear partial summary
      clearPartialSummary();
      setPartialSummary(null);

      // Save to history
      addSummaryHistory({
        summary: response,
        modelUsed: partialSummary.modelUsed,
        configName: config.name,
        configId: config.id,
        totalCommits: partialSummary.totalCommits,
        generatedAt: new Date().toISOString(),
        projectStats: {
          totalCommits: partialSummary.totalCommits,
          uniqueContributors: stats.uniqueContributors,
          uniqueProjects: stats.uniqueProjects,
          filesWithChanges: stats.filesWithChanges,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to continue generation");
    } finally {
      setContinuing(false);
    }
  };

  // Discard partial summary
  const handleDiscardPartial = () => {
    clearPartialSummary();
    setPartialSummary(null);
  };

  const handleOpenPromptDialog = () => {
    setTempPrompt({ ...customPrompt });
    setShowPromptDialog(true);
  };

  const handleResetPrompt = () => {
    const defaultPrompt = getDefaultCustomPrompt();
    setTempPrompt(defaultPrompt);
  };

  const handleSavePrompt = () => {
    setCustomPrompt(tempPrompt);
    saveCustomPrompt(tempPrompt);
    setShowPromptDialog(false);
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
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <p className="text-yellow-700 dark:text-yellow-300">
            No commits to summarize. Go to{" "}
            <button
              onClick={() => navigate("/commits")}
              className="underline font-medium text-yellow-800 dark:text-yellow-200 hover:text-yellow-900 dark:hover:text-yellow-100"
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
      <div className="bg-card rounded-lg border border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              AI Commit Summary
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {commits.length} commits available • {stats.filesWithChanges} files changed • {stats.uniqueContributors} contributors
            </p>
            {activeConfig && (
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span className="bg-muted px-1.5 py-0.5 rounded">{activeConfig.name}</span>
                <span>•</span>
                <span className="bg-muted px-1.5 py-0.5 rounded font-mono">{selectedModel || activeConfig.model}</span>
                {availableModels.length > 1 && (
                  <span className="text-primary">({availableModels.length} models available)</span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {/* Edit Prompt Dialog */}
            <Dialog open={showPromptDialog} onOpenChange={setShowPromptDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={handleOpenPromptDialog}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit Prompt
                </Button>
              </DialogTrigger>
              <DialogContent resizable className="flex flex-col p-0">
                <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
                  <DialogTitle>Custom Prompt</DialogTitle>
                  <DialogDescription>
                    Customize how the AI generates summaries. Use placeholders to include dynamic content.
                  </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="user" className="flex-1 flex flex-col overflow-hidden">
                  <div className="px-6 pt-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="user" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        User Prompt
                      </TabsTrigger>
                      <TabsTrigger value="system" className="flex items-center gap-2">
                        <Bot className="h-4 w-4" />
                        System Prompt
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="system" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
                    <div className="h-full flex flex-col">
                      <label className="block text-sm font-medium text-foreground mb-1">
                        System Prompt
                      </label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Defines the AI's role and behavior. This sets the context for how the AI should respond.
                      </p>
                      <Textarea
                        value={tempPrompt.systemPrompt}
                        onChange={(e) =>
                          setTempPrompt((prev) => ({ ...prev, systemPrompt: e.target.value }))
                        }
                        className="flex-1 min-h-[200px] font-mono text-sm"
                        placeholder="You are a helpful assistant that analyzes Git commits..."
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="user" className="flex-1 overflow-y-auto px-6 py-4 mt-0">
                    <div className="h-full flex flex-col">
                      <label className="block text-sm font-medium text-foreground mb-1">
                        User Prompt Template
                      </label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Use <code className="bg-muted px-1 rounded">{"{{commitCount}}"}</code> and{" "}
                        <code className="bg-muted px-1 rounded">{"{{commits}}"}</code> as placeholders.
                        The AI will respond in Markdown format.
                      </p>
                      <Textarea
                        value={tempPrompt.userPromptTemplate}
                        onChange={(e) =>
                          setTempPrompt((prev) => ({ ...prev, userPromptTemplate: e.target.value }))
                        }
                        className="flex-1 min-h-[200px] font-mono text-sm"
                        placeholder="Analyze the following commits and provide a summary..."
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30 flex-shrink-0">
                  <Button variant="outline" onClick={handleResetPrompt}>
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset to Default
                  </Button>
                  <Button onClick={handleSavePrompt}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {existingSummary && (
              <>
                <div className="relative">
                  <Button
                    variant="secondary"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    disabled={!!exporting}
                  >
                    {exporting ? (
                      `Exporting ${exporting.toUpperCase()}...`
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </>
                    )}
                  </Button>
                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border z-10">
                      <div className="py-1">
                        <button
                          onClick={() => handleExport("txt")}
                          className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                        >
                          📄 Export as Text (.txt)
                        </button>
                        <button
                          onClick={() => handleExport("csv")}
                          className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                        >
                          📊 Export as CSV (.csv)
                        </button>
                        <button
                          onClick={() => handleExport("pdf")}
                          className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                        >
                          📑 Export as PDF (.pdf)
                        </button>
                        <button
                          onClick={() => handleExport("docx")}
                          className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                        >
                          📝 Export as Word (.docx)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <Button variant="outline" onClick={handleClearSummary}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear
                </Button>
              </>
            )}
            {/* Model selector - show if multiple models available */}
            {activeConfig && availableModels.length > 1 && (
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setShowModelMenu(!showModelMenu)}
                  disabled={loading}
                >
                  <span className="truncate max-w-[150px]">{selectedModel || "Select model"}</span>
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
                {showModelMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-card rounded-lg shadow-lg border border-border z-10">
                    <div className="p-2 border-b border-border">
                      <p className="text-xs text-muted-foreground">Select model:</p>
                    </div>
                    <div className="py-1 max-h-48 overflow-y-auto">
                      {availableModels.map((model) => (
                        <button
                          key={model}
                          onClick={() => {
                            setSelectedModel(model);
                            setShowModelMenu(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center justify-between ${
                            model === selectedModel ? "bg-primary/10 text-primary" : "text-foreground"
                          }`}
                        >
                          <span className="truncate">{model}</span>
                          {model === selectedModel && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Generate/Regenerate button */}
            <Button
              onClick={() => handleGenerateSummary()}
              disabled={loading}
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : existingSummary ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Regenerate
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Summary
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-2xl font-bold text-primary">{stats.totalCommits}</p>
          <p className="text-sm text-muted-foreground">Total Commits</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-2xl font-bold text-green-600">{stats.uniqueContributors}</p>
          <p className="text-sm text-muted-foreground">Contributors</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-2xl font-bold text-purple-600">{stats.uniqueProjects}</p>
          <p className="text-sm text-muted-foreground">Projects</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <p className="text-2xl font-bold text-orange-600">{stats.filesWithChanges}</p>
          <p className="text-sm text-muted-foreground">Files Changed</p>
        </div>
      </div>

      {/* Top Contributors Preview */}
      {stats.topContributors.length > 0 && (
        <div className="bg-card rounded-lg border border-border p-4">
          <h3 className="font-medium text-foreground mb-2">Top Contributors</h3>
          <div className="flex flex-wrap gap-2">
            {stats.topContributors.map(({ name, count }) => (
              <span
                key={name}
                className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm"
              >
                {name} <span className="text-primary/70">({count})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Loading State - Show Skeleton */}
      {loading && (
        <SummarySkeleton />
      )}

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl">❌</span>
            <div>
              <p className="font-medium text-destructive">Error generating summary</p>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Partial Summary - Continue Generation Banner */}
      {partialSummary && !existingSummary && !loading && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {partialSummary.summary ? "Incomplete Summary Detected" : "Previous Generation Interrupted"}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  {partialSummary.summary
                    ? "A previous summary generation was interrupted. You can continue from where it left off or start fresh."
                    : "The last generation attempt failed or was interrupted. You can retry the generation."}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  Model: {partialSummary.modelUsed} • {partialSummary.totalCommits} commits • {new Date(partialSummary.generatedAt).toLocaleString()}
                </p>
                {/* Preview of partial summary (if exists) */}
                {partialSummary.summary && (
                  <div className="mt-3 p-3 bg-white dark:bg-amber-900/30 rounded border border-amber-200 dark:border-amber-700 max-h-32 overflow-y-auto">
                    <p className="text-sm text-amber-800 dark:text-amber-200 line-clamp-3">
                      {partialSummary.summary.substring(0, 300)}...
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <Button variant="outline" size="sm" onClick={handleDiscardPartial}>
              <Trash2 className="h-4 w-4 mr-2" />
              Discard
            </Button>
            <Button size="sm" onClick={handleContinueGeneration} disabled={continuing}>
              {continuing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  {partialSummary.summary ? "Continuing..." : "Retrying..."}
                </>
              ) : (
                <>
                  {partialSummary.summary ? (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Continue Generation
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Retry Generation
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Summary Results */}
      {existingSummary && !loading && (
        <>
          {/* Main Summary - Markdown Rendered */}
          <div className="bg-card rounded-lg border border-border" ref={summaryRef} id="summary-content">
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Summary</h3>
                <div className="text-sm text-muted-foreground">
                  Generated by {existingSummary.modelUsed} •{" "}
                  {new Date(existingSummary.generatedAt).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-2xl font-bold text-foreground mt-6 mb-4 first:mt-0">{children}</h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-xl font-bold text-foreground mt-5 mb-3 first:mt-0">{children}</h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-lg font-semibold text-foreground mt-4 mb-2 first:mt-0">{children}</h3>
                    ),
                    h4: ({ children }) => (
                      <h4 className="text-base font-semibold text-foreground mt-3 mb-2">{children}</h4>
                    ),
                    p: ({ children }) => (
                      <p className="text-muted-foreground leading-relaxed mb-3">{children}</p>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-3 ml-2">{children}</ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside text-muted-foreground space-y-1 mb-3 ml-2">{children}</ol>
                    ),
                    li: ({ children }) => (
                      <li className="text-muted-foreground">{children}</li>
                    ),
                    code: ({ className, children }) => {
                      const isInline = !className;
                      if (isInline) {
                        return (
                          <code className="bg-muted text-foreground px-1.5 py-0.5 rounded text-sm font-mono">
                            {children}
                          </code>
                        );
                      }
                      return (
                        <code className="block bg-muted text-foreground p-3 rounded text-sm font-mono overflow-x-auto">
                          {children}
                        </code>
                      );
                    },
                    pre: ({ children }) => (
                      <pre className="bg-muted rounded-lg p-3 overflow-x-auto mb-3">{children}</pre>
                    ),
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground my-3">
                        {children}
                      </blockquote>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold text-foreground">{children}</strong>
                    ),
                    em: ({ children }) => (
                      <em className="italic text-muted-foreground">{children}</em>
                    ),
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                        {children}
                      </a>
                    ),
                    hr: () => <hr className="border-border my-4" />,
                    table: ({ children }) => (
                      <div className="overflow-x-auto mb-3">
                        <table className="min-w-full border-collapse border border-border">{children}</table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-muted">{children}</thead>
                    ),
                    th: ({ children }) => (
                      <th className="border border-border px-3 py-2 text-left font-semibold text-foreground">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-border px-3 py-2 text-muted-foreground">{children}</td>
                    ),
                  }}
                >
                  {existingSummary.summary}
                </ReactMarkdown>
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">Analysis Info</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>
                • <strong className="text-foreground">{existingSummary.totalCommits}</strong> commits analyzed
              </li>
              <li>
                • Model used: <strong className="text-foreground">{existingSummary.modelUsed}</strong>
              </li>
              <li>
                • Generated at:{" "}
                <strong className="text-foreground">
                  {new Date(existingSummary.generatedAt).toLocaleString()}
                </strong>
              </li>
            </ul>
          </div>
        </>
      )}

      {/* No Summary Yet - only show if not loading and no existing summary */}
      {!existingSummary && !loading && !error && (
        <div className="bg-muted/50 rounded-lg p-8 text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Ready to Generate Summary
          </h3>
          <p className="text-muted-foreground mb-4">
            Click "Generate Summary" to analyze your {commits.length} commits with{" "}
            {stats.filesWithChanges} file changes using AI.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={handleOpenPromptDialog}>
              <Pencil className="h-4 w-4 mr-2" />
              Customize Prompt
            </Button>
            <Button onClick={() => handleGenerateSummary()}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Summary
            </Button>
          </div>
        </div>
      )}

      {/* Debug: Raw Response */}
      {isDebugMode() && rawResponse && (
        <div className="bg-muted rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-2">Raw API Response (Debug)</h3>
          <pre className="text-xs text-muted-foreground overflow-auto whitespace-pre-wrap max-h-96">
            {rawResponse}
          </pre>
        </div>
      )}

      {/* Debug Info */}
      {isDebugMode() && (
        <div className="bg-muted rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-2">Debug Info</h3>
          <pre className="text-xs text-muted-foreground overflow-auto">
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