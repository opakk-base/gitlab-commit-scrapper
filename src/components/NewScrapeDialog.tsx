import { useState, useEffect } from "react";
import {
  GitLabConfig,
  getGitLabConfig,
  fetchProjects,
  fetchBranches,
  fetchCommitsWithDiffs,
  GitLabProject,
  GitLabBranch,
  GitLabApiError,
  GitLabError,
} from "../services/gitlab";
import {
  saveScrapedCommits,
  saveScraperConfig,
  CommitWithProject,
} from "../services/scraper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef, RowSelectionState } from "@tanstack/react-table";
import { addDays, format } from "date-fns";
import { type DateRange } from "react-day-picker";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  CalendarIcon,
  Check,
  FolderOpen,
  GitBranch,
  FileCode,
  AlertCircle,
  Settings2,
  ListChecks,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

interface NewScrapeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  onError?: (error: GitLabError | null) => void;
}

// Project table columns with checkbox selection
const projectColumns: ColumnDef<GitLabProject>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
              ? "indeterminate"
              : false
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
  },
  {
    accessorKey: "path_with_namespace",
    header: "Path",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.path_with_namespace}
      </span>
    ),
  },
];

export function NewScrapeDialog({
  open,
  onOpenChange,
  onComplete,
  onError,
}: NewScrapeDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [gitlabConfig, setGitlabConfig] = useState<GitLabConfig | null>(null);
  const [projects, setProjects] = useState<GitLabProject[]>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [projectBranches, setProjectBranches] = useState<
    Map<number, GitLabBranch[]>
  >(new Map());
  const [branch, setBranch] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().getFullYear(), 0, 12),
    to: addDays(new Date(new Date().getFullYear(), 0, 12), 30),
  });
  const [includeDiffs, setIncludeDiffs] = useState<boolean>(true);
  const [maxCommits, setMaxCommits] = useState<number>(50);

  // Helper to get selected project IDs from row selection
  const getSelectedProjectIds = (): Set<number> => {
    return new Set(
      Object.keys(rowSelection)
        .filter((key) => rowSelection[key])
        .map((key) => parseInt(key, 10)),
    );
  };

  // Loading states
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapeProgress, setScrapeProgress] = useState("");

  // Error state
  const [stepError, setStepError] = useState<string | null>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setCurrentStep(1);
      setRowSelection({});
      setBranch("all");
      setDateRange(undefined);
      setIncludeDiffs(true);
      setMaxCommits(50);
      setStepError(null);
    }
  }, [open]);

  // Load projects when dialog opens
  useEffect(() => {
    if (open) {
      const config = getGitLabConfig();
      if (config) {
        setGitlabConfig(config);
        loadProjects(config);
      }
    }
  }, [open]);

  // Load branches when projects are selected
  useEffect(() => {
    const selectedIds = getSelectedProjectIds();
    if (gitlabConfig && selectedIds.size > 0 && open) {
      loadBranchesForSelectedProjects(selectedIds);
    }
  }, [rowSelection, gitlabConfig, open]);

  const loadProjects = async (config: GitLabConfig) => {
    setLoadingProjects(true);
    setStepError(null);
    try {
      const fetchedProjects = await fetchProjects(config);
      setProjects(fetchedProjects);
    } catch (err) {
      if (err instanceof GitLabApiError) {
        setStepError(err.gitlabError.message);
        onError?.(err.gitlabError);
      } else if (err instanceof Error) {
        setStepError(err.message);
      } else {
        setStepError("Failed to load projects");
      }
    } finally {
      setLoadingProjects(false);
    }
  };

  const loadBranchesForSelectedProjects = async (selectedIds: Set<number>) => {
    if (!gitlabConfig) return;
    setLoadingBranches(true);
    const newBranches = new Map<number, GitLabBranch[]>();

    try {
      await Promise.all(
        Array.from(selectedIds).map(async (projectId) => {
          try {
            const branches = await fetchBranches(gitlabConfig, projectId);
            newBranches.set(projectId, branches);
          } catch (err) {
            console.error(
              `Failed to load branches for project ${projectId}:`,
              err,
            );
            newBranches.set(projectId, []);
          }
        }),
      );
      setProjectBranches(newBranches);
    } finally {
      setLoadingBranches(false);
    }
  };

  const getCommonBranches = (): string[] => {
    const selectedIds = getSelectedProjectIds();
    if (selectedIds.size === 0) return [];
    const allBranchNames = new Set<string>();
    projectBranches.forEach((branches) => {
      branches.forEach((b) => allBranchNames.add(b.name));
    });
    return Array.from(allBranchNames).sort();
  };

  const branchExistsInAllProjects = (branchName: string): boolean => {
    const selectedIds = getSelectedProjectIds();
    if (selectedIds.size === 0) return false;
    for (const projectId of selectedIds) {
      const branches = projectBranches.get(projectId) || [];
      if (!branches.some((b) => b.name === branchName)) {
        return false;
      }
    }
    return true;
  };

  const validateStep1 = (): boolean => {
    const selectedIds = getSelectedProjectIds();
    if (selectedIds.size === 0) {
      setStepError("Please select at least one project");
      return false;
    }
    setStepError(null);
    return true;
  };

  const handleNextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    setCurrentStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    setStepError(null);
  };

  const handleScrape = async () => {
    const selectedIds = getSelectedProjectIds();
    if (!gitlabConfig || selectedIds.size === 0) return;

    setScraping(true);
    setStepError(null);
    setScrapeProgress("Starting scrape...");

    try {
      const projectIds = Array.from(selectedIds);
      const allCommits: CommitWithProject[] = [];

      for (let i = 0; i < projectIds.length; i++) {
        const projectId = projectIds[i];
        const project = projects.find((p) => p.id === projectId);
        const projectBranchList = projectBranches.get(projectId) || [];

        let branchToUse = branch === "all" ? "" : branch;
        if (
          branchToUse &&
          !projectBranchList.some((b) => b.name === branchToUse)
        ) {
          const defaultBranch = projectBranchList.find((b) => b.default);
          branchToUse = defaultBranch?.name || "";
        }

        setScrapeProgress(
          `Scraping project ${i + 1}/${projectIds.length}: ${project?.name || projectId}${includeDiffs ? " (with diffs)" : ""}`,
        );

        const commitsWithDiffs = await fetchCommitsWithDiffs(
          gitlabConfig,
          projectId,
          project?.path_with_namespace || String(projectId),
          dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "",
          dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "",
          branchToUse || undefined,
          maxCommits,
        );

        commitsWithDiffs.forEach((cwd) => {
          allCommits.push({
            ...cwd.commit,
            projectId,
            projectName: project?.path_with_namespace || String(projectId),
            branch: branchToUse || "all",
            diffs: includeDiffs ? cwd.diffs : undefined,
          });
        });

        setScrapeProgress(
          `Found ${allCommits.length} commits from ${i + 1}/${projectIds.length} projects...`,
        );
      }

      allCommits.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setScrapeProgress("Done! Saving...");

      saveScrapedCommits(allCommits);
      saveScraperConfig({
        projectIds,
        sinceDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "",
        untilDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "",
        branch: branch === "all" ? "" : branch,
        includeDiffs,
        scrapedAt: new Date().toISOString(),
      });

      setScrapeProgress("Done!");
      onOpenChange(false);
      onComplete?.();
    } catch (err) {
      if (err instanceof GitLabApiError) {
        setStepError(err.gitlabError.message);
        onError?.(err.gitlabError);
      } else if (err instanceof Error) {
        setStepError(err.message);
      } else {
        setStepError("Failed to scrape commits");
      }
    } finally {
      setScraping(false);
      setScrapeProgress("");
    }
  };

  const getStepIcon = (step: number) => {
    switch (step) {
      case 1:
        return <FolderOpen className="h-4 w-4" />;
      case 2:
        return <Settings2 className="h-4 w-4" />;
      case 3:
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 1:
        return "Select Projects";
      case 2:
        return "Configure Options";
      case 3:
        return "Review & Scrape";
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header Section */}
        <div className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">New Scrape</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Configure and run a new commit scrape from your GitLab projects
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Step Progress Indicator */}
        <div className="px-6 py-4 bg-muted/30 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step, index) => (
              <div key={step} className="flex items-center flex-1">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-200 ${
                      step === currentStep
                        ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                        : step < currentStep
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted border border-border text-muted-foreground"
                    }`}
                  >
                    {step < currentStep ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      getStepIcon(step)
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        step === currentStep
                          ? "text-foreground"
                          : step < currentStep
                            ? "text-primary"
                            : "text-muted-foreground"
                      }`}
                    >
                      Step {step}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {step === 1 && "Select Projects"}
                      {step === 2 && "Configure"}
                      {step === 3 && "Review"}
                    </p>
                  </div>
                </div>
                {index < 2 && (
                  <div
                    className={`h-0.5 flex-1 mx-4 rounded-full transition-colors ${
                      step < currentStep ? "bg-primary" : "bg-border"
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Error Display */}
          {stepError && (
            <div className="mb-4">
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive font-medium">
                    {stepError}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Select Projects */}
          {currentStep === 1 && (
            <div className="space-y-5">
              {loadingProjects ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="mt-3 text-muted-foreground">
                    Loading projects...
                  </span>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12 border border-dashed rounded-lg bg-muted/30">
                  <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground font-medium">
                    No projects found
                  </p>
                  <p className="text-sm text-muted-foreground/70 mt-1">
                    Check your GitLab configuration in Settings
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between bg-muted/50 px-4 py-2 rounded-lg">
                    <span className="text-sm font-medium">
                      {
                        Object.keys(rowSelection).filter((k) => rowSelection[k])
                          .length
                      }{" "}
                      of {projects.length} projects selected
                    </span>
                  </div>

                  <DataTable
                    columns={projectColumns}
                    data={projects}
                    rowSelection={rowSelection}
                    onRowSelectionChange={setRowSelection}
                    getRowId={(row) => String(row.id)}
                  />
                </>
              )}
            </div>
          )}

          {/* Step 2: Configure Options */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="space-y-6">
                {/* Branch Selection */}
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-primary" />
                      Branch Filter
                    </CardTitle>
                    <CardDescription>
                      Select which branch to scrape commits from
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingBranches ? (
                      <div className="flex items-center gap-2 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-sm text-muted-foreground">
                          Loading branches...
                        </span>
                      </div>
                    ) : (
                      <Select value={branch} onValueChange={setBranch}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="All Branches (default for each project)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Branches</SelectItem>
                          {getCommonBranches().map((branchName) => (
                            <SelectItem
                              key={branchName}
                              value={branchName}
                              disabled={!branchExistsInAllProjects(branchName)}
                            >
                              <div className="flex items-center gap-2">
                                <span>{branchName}</span>
                                {!branchExistsInAllProjects(branchName) && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    Not in all projects
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </CardContent>
                </Card>

                {/* Date Range */}
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-primary" />
                      Date Range
                    </CardTitle>
                    <CardDescription>
                      Filter commits by date range (optional)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="date"
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                            {dateRange?.from ? (
                              dateRange.to ? (
                                <span>
                                  {format(dateRange.from, "LLL dd, y")} -{" "}
                                  {format(dateRange.to, "LLL dd, y")}
                                </span>
                              ) : (
                                format(dateRange.from, "LLL dd, y")
                              )
                            ) : (
                              <span className="text-muted-foreground">
                                Pick a date range
                              </span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="range"
                            defaultMonth={dateRange?.from}
                            selected={dateRange}
                            onSelect={setDateRange}
                            numberOfMonths={2}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                          />
                        </PopoverContent>
                      </Popover>
                      {dateRange?.from && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-fit text-muted-foreground hover:text-foreground"
                          onClick={() => setDateRange(undefined)}
                        >
                          Clear date range
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Advanced Options */}
                <Card className="border-border">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      Advanced Options
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Include Diffs */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">
                          Include File Changes
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Fetch diff details for better AI summaries (slower but
                          more context)
                        </p>
                      </div>
                      <Switch
                        checked={includeDiffs}
                        onCheckedChange={setIncludeDiffs}
                      />
                    </div>

                    <Separator />

                    {/* Max Commits */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium">
                          Max Commits per Project
                        </Label>
                        <Badge variant="secondary" className="text-xs">
                          Max 500
                        </Badge>
                      </div>
                      <Input
                        type="number"
                        value={maxCommits}
                        onChange={(e) =>
                          setMaxCommits(
                            Math.max(
                              1,
                              Math.min(500, parseInt(e.target.value) || 50),
                            ),
                          )
                        }
                        min={1}
                        max={500}
                        className="w-32"
                      />
                      <p className="text-xs text-muted-foreground">
                        Limit commits per project to avoid API rate limits
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Step 3: Review & Scrape */}
          {currentStep === 3 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  Review & Scrape
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Review your configuration before starting the scrape
                </p>
              </div>

              <Card className="bg-muted/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    Configuration Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-sm">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <FolderOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Projects:{" "}
                        </span>
                        <strong className="text-foreground">
                          {
                            Object.keys(rowSelection).filter(
                              (k) => rowSelection[k],
                            ).length
                          }{" "}
                          selected
                        </strong>
                      </div>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <GitBranch className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-muted-foreground">Branch: </span>
                        <strong className="text-foreground">
                          {branch === "all" ? "All branches" : branch}
                        </strong>
                      </div>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Date range:{" "}
                        </span>
                        <strong className="text-foreground">
                          {dateRange?.from
                            ? format(dateRange.from, "yyyy-MM-dd")
                            : "No start"}{" "}
                          to{" "}
                          {dateRange?.to
                            ? format(dateRange.to, "yyyy-MM-dd")
                            : "No end"}
                        </strong>
                      </div>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <FileCode className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Include diffs:{" "}
                        </span>
                        <strong className="text-foreground">
                          {includeDiffs ? "Yes" : "No"}
                        </strong>
                      </div>
                    </li>
                    <li className="flex items-center gap-3 text-sm">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                        <Check className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-muted-foreground">
                          Max commits/project:{" "}
                        </span>
                        <strong className="text-foreground">
                          {maxCommits}
                        </strong>
                      </div>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Scrape Progress */}
              {scraping && scrapeProgress && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <p className="text-sm font-medium text-primary">
                        {scrapeProgress}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            Step {currentStep} of 3
          </div>
          <div className="flex items-center gap-3">
            {currentStep > 1 && (
              <Button
                variant="outline"
                onClick={handlePrevStep}
                disabled={scraping}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            {currentStep < 3 ? (
              <Button onClick={handleNextStep}>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleScrape}
                disabled={scraping}
                className="min-w-[140px]"
              >
                {scraping ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Scraping...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Start Scrape
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default NewScrapeDialog;
