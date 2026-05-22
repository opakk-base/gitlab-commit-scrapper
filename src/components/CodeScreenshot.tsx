import React, { useState, useRef, useEffect } from "react";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas-pro";

import { 
  Camera, 
  Check, 
  Copy, 
  Sun, 
  Moon, 
  ChevronDown, 
  FileText, 
  Code, 
  Sparkles, 
  Download, 
  RefreshCw,
  AlertCircle
} from "lucide-react";
import { CommitWithProject } from "@/services/scraper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface CodeScreenshotProps {
  files: string[];
  commits: CommitWithProject[];
}

interface DiffInfo {
  path: string;
  diff: string;
  projectName: string;
  commitSha: string;
  commitTitle: string;
  author: string;
  date: string;
  newFile: boolean;
  deletedFile: boolean;
  renamedFile: boolean;
}

interface DiffLine {
  text: string;
  type: "addition" | "deletion" | "hunk-header" | "normal";
  oldLineNumber?: number;
  newLineNumber?: number;
}

type GradientType = "sunset" | "ocean" | "emerald" | "dark" | "none";

export default function CodeScreenshot({ files, commits }: CodeScreenshotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "settings">("preview");
  const [editorTheme, setEditorTheme] = useState<"dark" | "light">("dark");
  const [gradient, setGradient] = useState<GradientType>("sunset");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Available diffs and state
  const [availableDiffs, setAvailableDiffs] = useState<DiffInfo[]>([]);
  const [matchedDiffs, setMatchedDiffs] = useState<DiffInfo[]>([]);
  const [selectedDiff, setSelectedDiff] = useState<DiffInfo | null>(null);
  const [showFileDropdown, setShowFileDropdown] = useState(false);

  // 1. Gather all available diffs and match files
  useEffect(() => {
    // Extract all unique diffs from scraper commits
    const allDiffs: DiffInfo[] = [];
    const seenPaths = new Set<string>();

    commits.forEach((c) => {
      c.diffs?.forEach((d) => {
        const path = d.new_path || d.old_path;
        if (path && d.diff && !seenPaths.has(path)) {
          seenPaths.add(path);
          allDiffs.push({
            path,
            diff: d.diff,
            projectName: c.projectName,
            commitSha: c.short_id,
            commitTitle: c.title,
            author: c.author_name,
            date: new Date(c.created_at).toLocaleDateString(),
            newFile: d.new_file,
            deletedFile: d.deleted_file,
            renamedFile: d.renamed_file,
          });
        }
      });
    });

    setAvailableDiffs(allDiffs);

    // Filter matched diffs based on files prop
    const matched: DiffInfo[] = [];
    files.forEach((file) => {
      const trimmed = file.trim().replace(/^`|`$/g, ""); // Remove backticks if present
      if (!trimmed) return;

      // Check exact match
      let found = allDiffs.find((d) => d.path === trimmed);

      // Check suffix match if not found (e.g. path ends with trimmed filename)
      if (!found) {
        found = allDiffs.find(
          (d) =>
            d.path.endsWith(trimmed) || 
            trimmed.endsWith(d.path) ||
            d.path.toLowerCase().includes(trimmed.toLowerCase())
        );
      }

      if (found && !matched.some((m) => m.path === found!.path)) {
        matched.push(found);
      }
    });

    setMatchedDiffs(matched);

    // Set initial active diff
    if (matched.length > 0) {
      setSelectedDiff(matched[0]);
    } else if (allDiffs.length > 0) {
      // Fallback to first available diff in the scraping batch
      setSelectedDiff(allDiffs[0]);
    }
  }, [files, commits]);

  if (!selectedDiff) {
    return (
      <div className="bg-muted/30 border border-dashed border-border rounded-lg p-6 text-center my-4">
        <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="h-6 w-6 text-amber-500" />
        </div>
        <h4 className="text-sm font-medium text-foreground">Code Snapshot Placeholder</h4>
        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
          No code diff changes were found for the referenced files in the scraped commits. Ensure diffs are enabled during scraper config.
        </p>
      </div>
    );
  }

  // 2. Parse git diff patch
  const parseDiffText = (diffStr: string): DiffLine[] => {
    const lines = diffStr.split("\n");
    const parsed: DiffLine[] = [];

    let oldLine = 0;
    let newLine = 0;

    lines.forEach((line) => {
      // Skip the diff header lines
      if (
        line.startsWith("---") ||
        line.startsWith("+++") ||
        line.startsWith("index") ||
        line.startsWith("diff --git") ||
        line.startsWith("new file mode") ||
        line.startsWith("deleted file mode")
      ) {
        return;
      }

      if (line.startsWith("@@")) {
        // Parse hunk header, e.g. @@ -42,7 +42,8 @@
        const match = line.match(/@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
        if (match) {
          oldLine = parseInt(match[1], 10);
          newLine = parseInt(match[2], 10);
        }
        parsed.push({
          text: line,
          type: "hunk-header",
        });
      } else if (line.startsWith("+")) {
        parsed.push({
          text: line.substring(1),
          type: "addition",
          newLineNumber: newLine++,
        });
      } else if (line.startsWith("-")) {
        parsed.push({
          text: line.substring(1),
          type: "deletion",
          oldLineNumber: oldLine++,
        });
      } else {
        // Normal context line
        const text = line.startsWith(" ") ? line.substring(1) : line;
        parsed.push({
          text,
          type: "normal",
          oldLineNumber: oldLine++,
          newLineNumber: newLine++,
        });
      }
    });

    return parsed;
  };

  const diffLines = parseDiffText(selectedDiff.diff);

  // 3. Export as PNG
  const handleExportPNG = async () => {
    if (!containerRef.current) return;
    setExporting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        scale: 3,
        backgroundColor: null,
        logging: false,
        allowTaint: true,
      });

      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const rawFilename = selectedDiff.path.split("/").pop() || "code";
          const filename = `${rawFilename}-diff-screenshot-${new Date()
            .toISOString()
            .split("T")[0]}`;
          saveAs(blob, `${filename}.png`);
          toast.success("High-resolution code snapshot saved!");
        } else {
          toast.error("Failed to generate screenshot blob.");
        }
        setExporting(false);
      }, "image/png");
    } catch (err) {
      console.error("Screenshot capture failed:", err);
      toast.error("Failed to export image.");
      setExporting(false);
    }
  };

  // 4. Copy raw code changes to clipboard
  const handleCopyCode = () => {
    const rawLines = diffLines
      .filter((l) => l.type !== "hunk-header")
      .map((l) => {
        if (l.type === "addition") return `+ ${l.text}`;
        if (l.type === "deletion") return `- ${l.text}`;
        return `  ${l.text}`;
      })
      .join("\n");

    navigator.clipboard.writeText(rawLines);
    setCopied(true);
    toast.success("Diff code copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Gradient classes mapping
  const gradientClasses = {
    sunset: "bg-gradient-to-tr from-rose-500 via-purple-600 to-indigo-600 shadow-xl",
    ocean: "bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 shadow-xl",
    emerald: "bg-gradient-to-tr from-emerald-400 via-teal-600 to-indigo-600 shadow-xl",
    dark: "bg-gradient-to-tr from-slate-900 via-slate-800 to-slate-950 shadow-lg border border-border",
    none: "bg-transparent p-0 shadow-none border-0",
  };

  const getGradientLabel = (type: GradientType) => {
    switch (type) {
      case "sunset": return "🌅 Sunset";
      case "ocean": return "🌊 Ocean";
      case "emerald": return "🍃 Emerald";
      case "dark": return "🌑 Cyber";
      case "none": return "❌ Clean";
    }
  };

  const isMatched = matchedDiffs.some((m) => m.path === selectedDiff.path);

  return (
    <div className="w-full my-6 bg-card rounded-xl border border-border overflow-hidden transition-all duration-300 shadow-sm hover:shadow-md">
      {/* Control Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-border bg-muted/40">
        {/* File Selector Selector / Badge */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowFileDropdown(!showFileDropdown)}
              className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border rounded-lg hover:bg-muted/70 text-xs font-mono font-medium max-w-[280px] md:max-w-[450px] truncate shadow-sm transition-all hover:scale-[1.01]"
            >
              <FileText className="h-3.5 w-3.5 text-primary flex-shrink-0" />
              <span className="truncate">{selectedDiff.path}</span>
              <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
            </button>

            {showFileDropdown && (
              <div className="absolute left-0 mt-1 w-72 max-h-72 overflow-y-auto bg-popover text-popover-foreground border border-border rounded-lg shadow-xl z-20 py-1 scrollbar-thin">
                {/* Section: Matched files in this section */}
                {matchedDiffs.length > 0 && (
                  <div className="px-2 py-1">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-2 py-1">
                      Matched in Section
                    </p>
                    {matchedDiffs.map((d) => (
                      <button
                        key={`matched-${d.path}`}
                        onClick={() => {
                          setSelectedDiff(d);
                          setShowFileDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono truncate transition-colors flex items-center justify-between ${
                          selectedDiff.path === d.path
                            ? "bg-primary/10 text-primary font-semibold"
                            : "hover:bg-muted"
                        }`}
                      >
                        <span className="truncate">{d.path.split("/").pop()}</span>
                        <Badge variant="secondary" className="text-[9px] scale-90 px-1 py-0 font-sans">
                          matched
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}

                {/* Section: Other available modified files in batch */}
                <div className="px-2 py-1 border-t border-border mt-1 pt-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-2 py-1">
                    All Batch Files ({availableDiffs.length})
                  </p>
                  {availableDiffs
                    .filter((d) => !matchedDiffs.some((m) => m.path === d.path))
                    .map((d) => (
                      <button
                        key={`all-${d.path}`}
                        onClick={() => {
                          setSelectedDiff(d);
                          setShowFileDropdown(false);
                        }}
                        className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono truncate transition-colors ${
                          selectedDiff.path === d.path
                            ? "bg-primary/10 text-primary font-semibold"
                            : "hover:bg-muted"
                        }`}
                      >
                        {d.path.split("/").pop()}
                      </button>
                    ))}
                </div>
              </div>
            )}
          </div>

          {!isMatched && (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px]">
              Dropdown Selector Fallback
            </Badge>
          )}
        </div>

        {/* Action Toggles & Capture Button */}
        <div className="flex items-center gap-2">
          {/* Theme Selector */}
          <button
            onClick={() => setEditorTheme(editorTheme === "dark" ? "light" : "dark")}
            className="p-1.5 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors shadow-sm"
            title="Toggle Theme"
          >
            {editorTheme === "dark" ? (
              <Sun className="h-4 w-4 text-amber-500 animate-spin-slow" />
            ) : (
              <Moon className="h-4 w-4 text-indigo-500" />
            )}
          </button>

          {/* Gradient Dropdown */}
          <div className="relative group">
            <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-card border border-border rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              <span>{getGradientLabel(gradient)}</span>
            </button>
            <div className="absolute right-0 mt-1 w-32 bg-popover border border-border rounded-lg shadow-xl z-20 py-1 hidden group-focus-within:block group-hover:block">
              {(["sunset", "ocean", "emerald", "dark", "none"] as GradientType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setGradient(type)}
                  className={`w-full text-left px-3 py-1.5 text-xs transition-colors hover:bg-muted ${
                    gradient === type ? "font-semibold text-primary bg-primary/5" : ""
                  }`}
                >
                  {getGradientLabel(type)}
                </button>
              ))}
            </div>
          </div>

          <div className="h-4 w-px bg-border my-auto mx-1" />

          {/* Copy Button */}
          <Button variant="outline" size="sm" onClick={handleCopyCode} className="h-8 text-xs">
            {copied ? <Check className="h-3.5 w-3.5 mr-1.5 text-green-500" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
            Copy
          </Button>

          {/* Camera Save Button */}
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleExportPNG} 
            disabled={exporting}
            className="h-8 text-xs font-medium bg-gradient-to-r from-primary to-violet-600 text-white hover:from-primary/95 hover:to-violet-650 transition-all hover:shadow hover:scale-[1.02]"
          >
            {exporting ? (
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5 mr-1.5" />
            )}
            {exporting ? "Capturing..." : "Export Mockup"}
          </Button>
        </div>
      </div>

      {/* Snapshot Canvas Wrapper (Gradient Container) */}
      <div className="p-4 bg-muted/20 overflow-x-auto">
        <div
          ref={containerRef}
          className={`transition-all duration-300 ${
            gradient === "none" ? "p-0" : "p-6 md:p-10"
          } rounded-2xl flex items-center justify-center ${gradientClasses[gradient]}`}
        >
          {/* macOS Code Mockup Window */}
          <div
            className={`w-full max-w-3xl rounded-xl overflow-hidden shadow-2xl transition-colors duration-300 font-mono text-xs ${
              editorTheme === "dark"
                ? "bg-[#0b0f19] border border-slate-800 text-slate-100"
                : "bg-slate-50 border border-slate-200 text-slate-900"
            }`}
          >
            {/* macOS Title Bar */}
            <div
              className={`flex items-center justify-between px-4 py-3 border-b select-none ${
                editorTheme === "dark"
                  ? "bg-[#0f1422] border-slate-800 text-slate-400"
                  : "bg-slate-100 border-slate-200 text-slate-500"
              }`}
            >
              {/* Window Controls (macOS circles) */}
              <div className="flex gap-2 flex-shrink-0">
                <span className="w-3 h-3 rounded-full bg-rose-500 hover:opacity-80 transition-opacity" />
                <span className="w-3 h-3 rounded-full bg-amber-500 hover:opacity-80 transition-opacity" />
                <span className="w-3 h-3 rounded-full bg-emerald-500 hover:opacity-80 transition-opacity" />
              </div>

              {/* Mockup Title: File name */}
              <span className="text-[11px] font-medium font-mono truncate mx-4 flex items-center gap-1.5">
                <Code className="h-3 w-3 text-violet-500" />
                {selectedDiff.path.split("/").pop()}
              </span>

              {/* Extra dummy window widget or branch name */}
              <span className="text-[9px] font-semibold opacity-60 uppercase tracking-widest flex-shrink-0">
                Git Diff
              </span>
            </div>

            {/* Code Lines Display */}
            <div className="py-4 overflow-x-auto max-h-[380px] overflow-y-auto scrollbar-thin select-text">
              <table className="w-full border-collapse">
                <tbody>
                  {diffLines.map((line, idx) => {
                    const isAdd = line.type === "addition";
                    const isDel = line.type === "deletion";
                    const isHunk = line.type === "hunk-header";

                    // Row colors based on diff line type
                    let rowBg = "";
                    let numColor = "opacity-40";
                    let codeColor = "";

                    if (isAdd) {
                      rowBg = editorTheme === "dark" ? "bg-emerald-500/10 text-emerald-300" : "bg-emerald-50/70 text-emerald-800";
                      numColor = "text-emerald-500 opacity-60";
                    } else if (isDel) {
                      rowBg = editorTheme === "dark" ? "bg-rose-500/10 text-rose-300 line-through decoration-rose-500/30" : "bg-rose-50/70 text-rose-800 line-through decoration-rose-500/25";
                      numColor = "text-rose-500 opacity-60";
                    } else if (isHunk) {
                      rowBg = editorTheme === "dark" ? "bg-indigo-500/20 text-indigo-300 font-semibold my-1" : "bg-indigo-50/70 text-indigo-800 font-semibold my-1";
                      numColor = "text-indigo-400 opacity-60";
                    } else {
                      codeColor = editorTheme === "dark" ? "text-slate-300" : "text-slate-700";
                    }

                    return (
                      <tr 
                        key={`line-${idx}`} 
                        className={`group border-l-2 transition-all ${
                          isAdd ? "border-emerald-500" : isDel ? "border-rose-500" : isHunk ? "border-indigo-500" : "border-transparent"
                        } ${rowBg}`}
                      >
                        {/* Old Line Number */}
                        <td className={`w-10 select-none text-right pr-3 font-mono text-[10px] ${numColor} border-r border-slate-700/10 dark:border-slate-800/20`}>
                          {!isHunk && line.oldLineNumber !== undefined ? line.oldLineNumber : ""}
                        </td>
                        {/* New Line Number */}
                        <td className={`w-10 select-none text-right pr-3 pl-1 font-mono text-[10px] ${numColor} border-r border-slate-700/10 dark:border-slate-800/20`}>
                          {!isHunk && line.newLineNumber !== undefined ? line.newLineNumber : ""}
                        </td>
                        {/* Diff Indicator Sign (+ / - / @@) */}
                        <td className="w-6 select-none text-center font-bold font-mono text-[11px] opacity-70">
                          {isAdd ? "+" : isDel ? "-" : isHunk ? "hunk" : ""}
                        </td>
                        {/* Code String */}
                        <td className={`px-4 py-0.5 whitespace-pre font-mono leading-relaxed text-left text-[11px] ${codeColor} select-text`}>
                          {isHunk ? (
                            <span className="opacity-80 italic">{line.text}</span>
                          ) : (
                            line.text
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Editor Footer / Project Metadata */}
            <div
              className={`px-4 py-2 text-[10px] border-t flex items-center justify-between select-none opacity-80 ${
                editorTheme === "dark"
                  ? "bg-[#0b0f19] border-slate-800 text-slate-500"
                  : "bg-slate-50 border-slate-200 text-slate-500"
              }`}
            >
              <span>
                Project: <strong className="text-foreground">{selectedDiff.projectName}</strong> • Commit: <strong className="text-foreground">{selectedDiff.commitSha}</strong>
              </span>
              <span>
                Modified: {selectedDiff.date} by {selectedDiff.author.split(" ")[0]}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
