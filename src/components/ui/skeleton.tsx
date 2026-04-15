import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Bot } from "lucide-react";

interface SummarySkeletonProps {
  className?: string;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function SummarySkeleton({ className }: SummarySkeletonProps) {
  return (
    <div className={cn("relative", className)}>
      {/* Skeleton content behind the overlay */}
      <div className="space-y-6 opacity-40">
        {/* Summary Card */}
        <div className="bg-card rounded-lg border border-border">
          {/* Header */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-48" />
            </div>
          </div>

          {/* Content — mimics markdown output structure */}
          <div className="p-4 space-y-4">
            {/* H1 title */}
            <Skeleton className="h-7 w-2/3" />

            {/* Intro paragraph */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>

            {/* H2 section */}
            <Skeleton className="h-5 w-48 mt-2" />

            {/* Bullet list */}
            <div className="space-y-2 pl-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-2">
                  <Skeleton className="h-1.5 w-1.5 rounded-full mt-[7px] shrink-0" />
                  <Skeleton className={cn("h-4", i === 3 ? "w-3/5" : "w-[85%]")} />
                </div>
              ))}
            </div>

            {/* H2 section */}
            <Skeleton className="h-5 w-36 mt-2" />

            {/* Another paragraph */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>

            {/* Table */}
            <Skeleton className="h-5 w-40 mt-2" />
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted/50 p-2.5 flex gap-4">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-36" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              {[0, 1, 2].map((i) => (
                <div key={i} className="p-2.5 flex gap-4 border-t border-border">
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="h-3.5 w-36" />
                  <Skeleton className="h-3.5 w-20" />
                </div>
              ))}
            </div>

            {/* Final paragraph */}
            <Skeleton className="h-5 w-32 mt-2" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>
      </div>

      {/* Center overlay card */}
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="bg-card border border-border rounded-xl shadow-lg p-8 max-w-xs w-full text-center">
          {/* Animated icon */}
          <div className="relative mx-auto mb-5 w-14 h-14">
            {/* Spinning ring */}
            <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
            <div
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary"
              style={{ animation: "spin 1.2s linear infinite" }}
            />
            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <Bot className="h-6 w-6 text-primary" />
            </div>
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-foreground mb-1">
            Generating Summary
          </p>

          {/* Rotating tip */}
          <RotatingTip />

          {/* Bouncing dots */}
          <div className="flex items-center justify-center gap-1 mt-4">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-1.5 h-1.5 rounded-full bg-primary"
                style={{
                  animation: "bounce 1s ease-in-out infinite",
                  animationDelay: `${i * 150}ms`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Rotating tips while waiting
const tips = [
  "Analyzing commit patterns...",
  "Extracting key changes...",
  "Identifying contributors...",
  "Organizing by project...",
  "Preparing insights...",
];

function RotatingTip() {
  const [tipIndex, setTipIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setTipIndex((prev) => (prev + 1) % tips.length);
        setFade(true);
      }, 300);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <p
      className="text-xs text-muted-foreground mt-1 transition-opacity duration-300"
      style={{ opacity: fade ? 1 : 0 }}
    >
      {tips[tipIndex]}
    </p>
  );
}

export default SummarySkeleton;
