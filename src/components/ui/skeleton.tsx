import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface SummarySkeletonProps {
  className?: string;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function SummarySkeleton({ className }: SummarySkeletonProps) {
  return (
    <div className={cn("relative space-y-6", className)}>
      {/* Summary Card */}
      <div className="bg-card rounded-lg border border-border">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Title skeleton */}
          <div className="space-y-2">
            <Skeleton className="h-7 w-3/4" />
          </div>

          {/* Paragraph skeletons with typing effect */}
          <div className="space-y-3">
            <TypingSkeletonLine width="w-full" delay={0} />
            <TypingSkeletonLine width="w-full" delay={0.5} />
            <TypingSkeletonLine width="w-4/5" delay={1} />
          </div>

          {/* Section header */}
          <div className="pt-4">
            <Skeleton className="h-5 w-40 mb-3" />
          </div>

          {/* List items skeleton */}
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-start gap-2">
                <Skeleton className="h-2 w-2 rounded-full mt-2" />
                <TypingSkeletonLine
                  width={i === 3 ? "w-3/5" : "w-4/5"}
                  delay={i * 0.3}
                />
              </div>
            ))}
          </div>

          {/* Another section */}
          <div className="pt-4 space-y-3">
            <Skeleton className="h-5 w-32 mb-2" />
            <TypingSkeletonLine width="w-full" delay={1.5} />
            <TypingSkeletonLine width="w-2/3" delay={2} />
          </div>

          {/* Table-like structure */}
          <div className="pt-4">
            <Skeleton className="h-5 w-32 mb-3" />
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 p-2 flex gap-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
              {[0, 1, 2].map((i) => (
                <div key={i} className="p-2 flex gap-4 border-t border-border">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Overlay with rotating tip */}
      <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] rounded-lg flex items-center justify-center z-10">
        <div className="bg-card border border-border rounded-xl shadow-sm p-6 w-100">
          <div className="flex flex-col items-center justify-center gap-4">
            <AIGeneratingDots />
            <span className="text-sm font-medium text-foreground">
              AI is generating your summary...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Typing skeleton line with animation delay
function TypingSkeletonLine({
  width,
  delay,
}: {
  width: string;
  delay: number;
}) {
  return (
    <div
      className="relative overflow-hidden"
      style={{ animationDelay: `${delay}s` }}
    >
      <Skeleton className={cn("h-4", width)} />
      {/* Typing cursor effect */}
      <div
        className="absolute right-0 top-0 h-full w-0.5 bg-primary/50 animate-blink"
        style={{ animationDelay: `${delay}s` }}
      />
    </div>
  );
}

// AI generating dots animation
function AIGeneratingDots() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2.5 h-2.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms", animationDuration: "800ms" }} />
      <span className="w-2.5 h-2.5 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: "150ms", animationDuration: "800ms" }} />
      <span className="w-2.5 h-2.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: "300ms", animationDuration: "800ms" }} />
    </div>
  );
}

// Rotating tips while waiting
const tips = [
  "💡 Tip: You can customize the prompt to focus on specific areas",
  "📊 Analyzing commit patterns and contributor activity...",
  "🔍 Extracting key changes from commit messages...",
  "✨ Preparing insights and recommendations...",
  "📝 Organizing summary by topics and projects...",
];

function RotatingTip() {
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="text-xs text-muted-foreground/80 transition-opacity duration-500">
      {tips[tipIndex]}
    </span>
  );
}

export default SummarySkeleton;
