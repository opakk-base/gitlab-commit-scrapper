import { useState } from "react";
import { Copy, ExternalLink, Plus, Minus, Pencil, ChevronDown, ChevronUp, GitCommitHorizontal, User, Calendar, FileText, Bot } from "lucide-react";
import { CommitWithProject } from "@/services/scraper";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

interface CommitDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commit: CommitWithProject | null;
}

export default function CommitDetailDialog({
  open,
  onOpenChange,
  commit,
}: CommitDetailDialogProps) {
  const [showFullMessage, setShowFullMessage] = useState(false);
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());

  if (!commit) return null;

  const hasMessage = commit.message && commit.message !== commit.title;
  const hasDiffs = commit.diffs && commit.diffs.length > 0;

  const copySha = () => {
    navigator.clipboard.writeText(commit.short_id);
    toast.success("Commit SHA copied to clipboard");
  };

  const copyFullSha = () => {
    navigator.clipboard.writeText(commit.id);
    toast.success("Full commit SHA copied to clipboard");
  };

  const toggleDiff = (path: string) => {
    setExpandedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const getFileIcon = (diff: typeof commit.diffs[0]) => {
    if (diff.new_file) return <Plus className="h-4 w-4 text-green-500" />;
    if (diff.deleted_file) return <Minus className="h-4 w-4 text-red-500" />;
    if (diff.renamed_file) return <Pencil className="h-4 w-4 text-yellow-500" />;
    return <Pencil className="h-4 w-4 text-blue-500" />;
  };

  const getFileStatus = (diff: typeof commit.diffs[0]) => {
    if (diff.new_file) return "new";
    if (diff.deleted_file) return "deleted";
    if (diff.renamed_file) return "renamed";
    return "modified";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header Section */}
        <div className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <GitCommitHorizontal className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                  <span className="font-mono text-primary">{commit.short_id}</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {commit.branch || "N/A"}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {commit.projectName}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            {/* Author & Date Card */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Commit Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Author: </span>
                      <span className="font-medium">{commit.author_name}</span>
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({commit.author_email})
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Date: </span>
                      <span className="font-medium">{formatDate(commit.created_at)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Title Card */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Title
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground font-medium">{commit.title}</p>
              </CardContent>
            </Card>

            {/* Full Message Card (if different from title) */}
            {hasMessage && (
              <Card className="border-border">
                <CardContent className="pt-4">
                  <button
                    onClick={() => setShowFullMessage(!showFullMessage)}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showFullMessage ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    <span className="font-medium">Full Message</span>
                  </button>
                  {showFullMessage && (
                    <pre className="mt-3 text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 rounded-lg p-3 overflow-x-auto border border-border">
                      {commit.message}
                    </pre>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Files Changed Card */}
            {hasDiffs && (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Files Changed
                  </CardTitle>
                  <CardDescription>
                    {commit.diffs.length} files modified in this commit
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {commit.diffs.map((diff, index) => {
                      const path = diff.new_path || diff.old_path;
                      const isExpanded = expandedDiffs.has(path);
                      const status = getFileStatus(diff);

                      return (
                        <div
                          key={`${path}-${index}`}
                          className="border rounded-lg overflow-hidden"
                        >
                          <div
                            className="flex items-center gap-2 p-2 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => toggleDiff(path)}
                          >
                            {getFileIcon(diff)}
                            <span className="text-sm font-mono truncate flex-1">
                              {path}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {status}
                            </Badge>
                            {diff.diff && (
                              isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              )
                            )}
                          </div>
                          {isExpanded && diff.diff && (
                            <div className="text-xs font-mono overflow-x-auto max-h-[200px] overflow-y-auto border-t border-border">
                              {diff.diff.split('\n').map((line, lineIndex) => {
                                if (line.startsWith('+') && !line.startsWith('+++')) {
                                  return (
                                    <div key={lineIndex} className="bg-green-500/30 text-green-900 dark:text-green-100 px-3 py-0.5">
                                      {line}
                                    </div>
                                  );
                                } else if (line.startsWith('-') && !line.startsWith('---')) {
                                  return (
                                    <div key={lineIndex} className="bg-red-500/30 text-red-900 dark:text-red-100 px-3 py-0.5">
                                      {line}
                                    </div>
                                  );
                                } else if (line.startsWith('@@')) {
                                  return (
                                    <div key={lineIndex} className="bg-primary/20 text-primary px-3 py-0.5 font-medium">
                                      {line}
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div key={lineIndex} className="text-muted-foreground px-3 py-0.5">
                                      {line}
                                    </div>
                                  );
                                }
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-muted-foreground font-mono">
            <span className="text-xs">{commit.id}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={copySha}>
              <Copy className="h-4 w-4 mr-1" />
              Copy SHA
            </Button>
            <Button variant="outline" size="sm" onClick={copyFullSha}>
              <Copy className="h-4 w-4 mr-1" />
              Full SHA
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => window.open(commit.web_url, "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Open in GitLab
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}