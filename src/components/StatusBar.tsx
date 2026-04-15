import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBackgroundTask } from "@/contexts/BackgroundTaskContext";
import { requestCancelTask } from "@/services/backgroundTask";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const { task, clearTask } = useBackgroundTask();
  const navigate = useNavigate();

  // Show notification on completion
  useEffect(() => {
    if (task?.status === "completed" && task.type === "summary") {
      toast.success("Summary Generated", {
        description: "Your AI summary has been generated successfully.",
        action: {
          label: "View",
          onClick: () => navigate("/commits/summary"),
        },
      });
    } else if (task?.status === "error") {
      toast.error("Generation Failed", {
        description: task.error || "An error occurred during generation.",
      });
    }
  }, [task?.status, task?.type, task?.error, navigate]);

  const handleCancel = () => {
    requestCancelTask();
    clearTask();
  };

  const handleView = () => {
    if (task?.type === "summary" || task?.type === "refine") {
      navigate("/commits/summary");
    }
    clearTask();
  };

  const handleDismiss = () => {
    clearTask();
  };

  const getStatusIcon = () => {
    switch (task?.status) {
      case "running":
        return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-3.5 w-3.5" />;
      case "error":
        return <XCircle className="h-3.5 w-3.5" />;
      default:
        return <Sparkles className="h-3.5 w-3.5" />;
    }
  };

  const getStatusColor = () => {
    switch (task?.status) {
      case "running":
        return "text-primary";
      case "completed":
        return "text-green-500";
      case "error":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <footer className="relative flex h-6 shrink-0 items-center border-t border-border bg-card text-xs select-none">
      {/* Left section */}
      <div className="flex items-center gap-2 flex-1 min-w-0 px-2">
        {task ? (
          <>
            {/* Status icon + message */}
            <div className={cn("flex items-center gap-1.5", getStatusColor())}>
              {getStatusIcon()}
              <span className="truncate">
                {task.message || (task.type === "summary" ? "Summary Generation" : "Text Refinement")}
              </span>
            </div>


            {/* Model + commits info */}
            {task.status === "completed" && task.result && (
              <span className="text-muted-foreground hidden sm:inline">
                — {task.result.modelUsed} • {task.result.totalCommits} commits
              </span>
            )}

            {/* Error snippet */}
            {task.status === "error" && task.error && (
              <span className="text-destructive/70 truncate hidden sm:inline">
                — {task.error}
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            Ready
          </span>
        )}
      </div>

      {/* Indeterminate progress bar — sliding shimmer */}
      {task?.status === "running" && (
        <div className="absolute left-0 right-0 top-0 h-[2px] bg-muted overflow-hidden">
          <div
            className="h-full w-1/3 bg-primary rounded-full"
            style={{
              animation: "statusbar-slide 1.5s ease-in-out infinite",
            }}
          />
          <style>{`
            @keyframes statusbar-slide {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(400%); }
            }
          `}</style>
        </div>
      )}

      {/* Right section — actions */}
      {task && (
        <div className="flex items-center gap-0.5 px-1 border-l border-border">
          {task.status === "running" && (
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Cancel"
            >
              <X className="h-3 w-3" />
              <span className="hidden sm:inline">Cancel</span>
            </button>
          )}
          {task.status === "completed" && (
            <>
              <button
                onClick={handleView}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="View Result"
              >
                <ExternalLink className="h-3 w-3" />
                <span className="hidden sm:inline">View</span>
              </button>
              <button
                onClick={handleDismiss}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                title="Dismiss"
              >
                <X className="h-3 w-3" />
              </button>
            </>
          )}
          {task.status === "error" && (
            <button
              onClick={handleDismiss}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Dismiss"
            >
              <X className="h-3 w-3" />
              <span className="hidden sm:inline">Dismiss</span>
            </button>
          )}
        </div>
      )}
    </footer>
  );
}

export default StatusBar;
