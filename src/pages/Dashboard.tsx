import { useState, useEffect } from "react";
import {
  getSummaryHistory,
  deleteSummaryHistory,
  clearSummaryHistory,
  addSummaryHistory,
  SummaryHistoryItem,
} from "../services/summaryHistory";
import {
  exportHistoryAsText,
  exportHistoryAsCSV,
  exportHistoryAsPDF,
  exportHistoryAsDOCX,
} from "../services/export";
import { getLLMConfig, humanizeText, LLMConfig } from "../services/llm";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { RefineDialog, RefineStyle, RefineResult } from "@/components/RefineDialog";
import ReactMarkdown from "react-markdown";
import {
  Download,
  Trash2,
  Eye,
  FileText,
  Clock,
  Bot,
  Users,
  FolderOpen,
  FileCode,
  AlertCircle,
  Wand2,
  RefreshCw,
  Calendar,
} from "lucide-react";

export default function Dashboard() {
  const [history, setHistory] = useState<SummaryHistoryItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<SummaryHistoryItem | null>(null);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState<string | null>(null);
  const [refining, setRefining] = useState(false);
  const [showRefineDialog, setShowRefineDialog] = useState(false);
  const [llmConfig, setLlmConfig] = useState<LLMConfig | null>(null);

  useEffect(() => {
    loadHistory();
    const config = getLLMConfig();
    setLlmConfig(config);
  }, []);

  const loadHistory = () => {
    const historyData = getSummaryHistory();
    setHistory(historyData);
  };

  const handleView = (item: SummaryHistoryItem) => {
    setSelectedItem(item);
    setShowViewDialog(true);
  };

  const handleDeleteConfirm = (id: string) => {
    setItemToDelete(id);
    setShowDeleteDialog(true);
  };

  const handleDelete = () => {
    if (itemToDelete) {
      deleteSummaryHistory(itemToDelete);
      loadHistory();
      setShowDeleteDialog(false);
      setItemToDelete(null);
    }
  };

  const handleClearAll = () => {
    clearSummaryHistory();
    loadHistory();
    setShowClearDialog(false);
  };

  const handleRefine = async (result: RefineResult) => {
    if (!selectedItem || !llmConfig) {
      toast.error("No LLM configuration available. Please configure LLM settings first.");
      return;
    }

    // Prevent refining already refined summaries
    if (selectedItem.type === "refined") {
      toast.error("This summary is already refined. Only original summaries can be refined.");
      return;
    }

    setRefining(true);
    setShowRefineDialog(false);

    try {
      const refinedText = await humanizeText(llmConfig, selectedItem.summary, {
        style: result.style,
        customPrompt: result.customPrompt,
        modelOverride: result.model,
      });

      // Save refined summary to history
      addSummaryHistory({
        summary: refinedText,
        modelUsed: result.model,
        configName: llmConfig.name,
        configId: llmConfig.id,
        totalCommits: selectedItem.totalCommits,
        generatedAt: new Date().toISOString(),
        projectStats: selectedItem.projectStats,
        type: "refined",
        refinedFromId: selectedItem.id,
        scrapeDateRange: selectedItem.scrapeDateRange,
      });

      loadHistory();
      toast.success("Summary refined successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to refine summary");
    } finally {
      setRefining(false);
    }
  };

  const openRefineDialog = () => {
    if (!llmConfig) {
      toast.error("No LLM configuration available. Please configure LLM settings first.");
      return;
    }
    setShowRefineDialog(true);
  };

  const handleExport = async (item: SummaryHistoryItem, format: "txt" | "csv" | "pdf" | "docx") => {
    setExporting(format);
    setShowExportMenu(null);

    const filename = `gitlab-summary-${new Date(item.generatedAt).toISOString().split("T")[0]}`;

    try {
      switch (format) {
        case "txt":
          exportHistoryAsText(item, filename);
          break;
        case "csv":
          exportHistoryAsCSV(item, filename);
          break;
        case "pdf":
          await exportHistoryAsPDF(item, filename);
          break;
        case "docx":
          await exportHistoryAsDOCX(item, filename);
          break;
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour ago`;
    if (diffDays < 7) return `${diffDays} day ago`;
    return formatDate(dateString);
  };

  // Stats for the dashboard header
  const totalSummaries = history.length;
  const totalCommitsAnalyzed = history.reduce((sum, item) => sum + item.totalCommits, 0);
  const uniqueConfigs = new Set(history.map((item) => item.configId)).size;
  const uniqueModels = new Set(history.map((item) => item.modelUsed)).size;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Summaries</p>
              <p className="text-2xl font-bold text-foreground">{totalSummaries}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-600/10 rounded-lg flex items-center justify-center">
              <FileCode className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Commits Analyzed</p>
              <p className="text-2xl font-bold text-foreground">{totalCommitsAnalyzed}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600/10 rounded-lg flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Configurations</p>
              <p className="text-2xl font-bold text-foreground">{uniqueConfigs}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-600/10 rounded-lg flex items-center justify-center">
              <Bot className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Models Used</p>
              <p className="text-2xl font-bold text-foreground">{uniqueModels}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary History */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Summary History</h3>
            <p className="text-sm text-muted-foreground">
              {history.length > 0
                ? `${history.length} summaries generated`
                : "No summaries generated yet"}
            </p>
          </div>
          {history.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowClearDialog(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Summary History</h3>
            <p className="text-muted-foreground mb-4">
              Generate summaries in the AI Summary page to see them here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {getRelativeTime(item.generatedAt)}
                      </span>
                      <span className="text-xs text-muted-foreground/70">
                        ({formatDate(item.generatedAt)})
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                        <Bot className="h-3 w-3" />
                        {item.modelUsed}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs">
                        {item.configName}
                      </span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-600/10 text-green-600 rounded text-xs">
                        {item.totalCommits} commits
                      </span>
                      {item.type === "refined" && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-600/10 text-purple-600 rounded text-xs">
                          <Wand2 className="h-3 w-3" />
                          Refined
                        </span>
                      )}
                    </div>

                    {item.projectStats && (
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {item.projectStats.uniqueContributors} contributors
                        </span>
                        <span className="flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {item.projectStats.uniqueProjects} projects
                        </span>
                        <span className="flex items-center gap-1">
                          <FileCode className="h-3 w-3" />
                          {item.projectStats.filesWithChanges} files
                        </span>
                      </div>
                    )}

                    {/* Scrape date range */}
                    {item.scrapeDateRange && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {new Date(item.scrapeDateRange.since).toLocaleDateString()} - {new Date(item.scrapeDateRange.until).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {/* Preview of summary */}
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {item.summary.substring(0, 150)}...
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleView(item)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>

                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowExportMenu(showExportMenu === item.id ? null : item.id)}
                        disabled={!!exporting}
                      >
                        {exporting ? (
                          `Exporting...`
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-1" />
                            Export
                          </>
                        )}
                      </Button>
                      {showExportMenu === item.id && (
                        <div className="absolute right-0 mt-2 w-48 bg-card rounded-lg shadow-lg border border-border z-10">
                          <div className="py-1">
                            <button
                              onClick={() => handleExport(item, "txt")}
                              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                            >
                              Export as Text (.txt)
                            </button>
                            <button
                              onClick={() => handleExport(item, "csv")}
                              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                            >
                              Export as CSV (.csv)
                            </button>
                            <button
                              onClick={() => handleExport(item, "pdf")}
                              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                            >
                              Export as PDF (.pdf)
                            </button>
                            <button
                              onClick={() => handleExport(item, "docx")}
                              className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-muted"
                            >
                              Export as Word (.docx)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteConfirm(item.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* View Summary Dialog */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Summary Details</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Generated on {selectedItem && formatDate(selectedItem.generatedAt)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {selectedItem && (
              <>
                {/* Meta info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Model</p>
                    <p className="font-medium text-foreground text-sm truncate">{selectedItem.modelUsed}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Configuration</p>
                    <p className="font-medium text-foreground text-sm truncate">{selectedItem.configName}</p>
                  </div>
                  <div className="bg-muted/50 rounded-lg p-3">
                    <p className="text-xs text-muted-foreground mb-1">Commits</p>
                    <p className="font-medium text-foreground text-sm">{selectedItem.totalCommits}</p>
                  </div>
                  {selectedItem.projectStats && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1">Contributors</p>
                      <p className="font-medium text-foreground text-sm">{selectedItem.projectStats.uniqueContributors}</p>
                    </div>
                  )}
                </div>

                {/* Refined indicator */}
                {selectedItem.type === "refined" && (
                  <div className="flex items-center gap-2 bg-purple-600/10 rounded-lg p-3">
                    <Wand2 className="h-4 w-4 text-purple-600" />
                    <span className="text-sm text-purple-600 font-medium">Refined Summary</span>
                    <span className="text-xs text-purple-600/70">
                      (Humanized version using {selectedItem.modelUsed})
                    </span>
                  </div>
                )}

                {/* Scrape date range */}
                {selectedItem.scrapeDateRange && (
                  <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Commits from:
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {new Date(selectedItem.scrapeDateRange.since).toLocaleDateString()} - {new Date(selectedItem.scrapeDateRange.until).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {/* Summary content */}
                <div className="bg-card rounded-lg border border-border">
                  <div className="p-4 border-b border-border">
                    <h4 className="font-medium text-foreground">Summary</h4>
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
                          p: ({ children }) => (
                            <p className="text-muted-foreground leading-relaxed mb-3">{children}</p>
                          ),
                          ul: ({ children }) => (
                            <ul className="list-disc list-inside text-muted-foreground space-y-1 mb-3 ml-2">{children}</ul>
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
                          strong: ({ children }) => (
                            <strong className="font-semibold text-foreground">{children}</strong>
                          ),
                        }}
                      >
                        {selectedItem.summary}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              {selectedItem?.type !== "refined" && llmConfig && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openRefineDialog}
                  disabled={refining}
                >
                  {refining ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Refining...
                    </>
                  ) : (
                    <>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Refine
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedItem && handleExport(selectedItem, "txt")}
              >
                <Download className="h-4 w-4 mr-2" />
                Text
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedItem && handleExport(selectedItem, "pdf")}
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => selectedItem && handleExport(selectedItem, "docx")}
              >
                <Download className="h-4 w-4 mr-2" />
                Word
              </Button>
            </div>
            <Button variant="secondary" onClick={() => setShowViewDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refine Dialog */}
      <RefineDialog
        open={showRefineDialog}
        onOpenChange={setShowRefineDialog}
        onRefine={handleRefine}
        llmConfig={llmConfig}
        isRefining={refining}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Summary</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this summary from history? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear All Confirmation Dialog */}
      <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear All History</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all summary history? This will delete {history.length} summaries and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClearAll}>
              Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}