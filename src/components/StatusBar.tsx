import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useBackgroundTask } from "@/contexts/BackgroundTaskContext";
import { requestCancelTask } from "@/services/backgroundTask";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  ExternalLink,
  Bot,
  Sparkles,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const { task, clearTask } = useBackgroundTask();
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Handle visibility
  useEffect(() => {
    if (task) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [task]);

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
    setIsOpen(false);
  };

  const handleView = () => {
    if (task?.type === "summary" || task?.type === "refine") {
      navigate("/commits/summary");
    }
    clearTask();
    setIsOpen(false);
  };

  const handleDismiss = () => {
    clearTask();
    setIsOpen(false);
  };

  if (!task) return null;

  const getStatusIcon = () => {
    switch (task.status) {
      case "running":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Bot className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getButtonColor = () => {
    switch (task.status) {
      case "running":
        return "bg-primary hover:bg-primary/90";
      case "completed":
        return "bg-green-500 hover:bg-green-600";
      case "error":
        return "bg-destructive hover:bg-destructive/90";
      default:
        return "bg-muted hover:bg-muted/80";
    }
  };

  const getProgressColor = () => {
    switch (task.status) {
      case "completed":
        return "bg-green-500";
      case "error":
        return "bg-destructive";
      default:
        return "bg-primary";
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 transition-all duration-300 ease-in-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
      )}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            className={cn(
              "w-14 h-14 rounded-full shadow-lg transition-all duration-200",
              getButtonColor()
            )}
            size="icon"
          >
            {getStatusIcon()}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-80 p-0"
          align="end"
          side="top"
          sideOffset={8}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">
                {task.type === "summary" ? "Summary Generation" : "Text Refinement"}
              </p>
              <p className="text-xs text-muted-foreground">
                Started {new Date(task.startedAt).toLocaleTimeString()}
              </p>
            </div>
            <div
              className={cn(
                "text-xs px-2 py-0.5 rounded font-medium",
                task.status === "running"
                  ? "bg-primary/10 text-primary"
                  : task.status === "completed"
                  ? "bg-green-500/10 text-green-500"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {task.status.charAt(0).toUpperCase() + task.status.slice(1)}
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-3">
            {/* Status Message */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground truncate flex-1">
                {task.message}
              </span>
              {task.status === "running" && (
                <span className="text-sm font-medium text-primary ml-2">
                  {task.progress}%
                </span>
              )}
            </div>

            {/* Progress Bar */}
            {task.status === "running" && (
              <Progress
                value={task.progress}
                className="h-2"
              />
            )}

            {/* Result Info */}
            {task.status === "completed" && task.result && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Model</span>
                  <span className="font-mono text-foreground">{task.result.modelUsed}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Commits</span>
                  <span className="text-foreground">{task.result.totalCommits}</span>
                </div>
              </div>
            )}

            {/* Error Message */}
            {task.status === "error" && task.error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-xs text-destructive">{task.error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border bg-muted/30">
            {task.status === "running" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                className="text-xs"
              >
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            )}
            {(task.status === "completed" || task.status === "error") && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDismiss}
                  className="text-xs"
                >
                  Dismiss
                </Button>
                {task.status === "completed" && (
                  <Button
                    size="sm"
                    onClick={handleView}
                    className="text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    View Result
                  </Button>
                )}
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default StatusBar;