export interface SummaryHistoryItem {
  id: string;
  summary: string;
  modelUsed: string;
  configName: string;
  configId: string;
  totalCommits: number;
  generatedAt: string;
  projectStats?: {
    totalCommits: number;
    uniqueContributors: number;
    uniqueProjects: number;
    filesWithChanges: number;
  };
  type?: "original" | "refined";
  refinedFromId?: string;
  scrapeDateRange?: {
    since: string;
    until: string;
  };
}

const SUMMARY_HISTORY_KEY = "summary_history";

export function getSummaryHistory(): SummaryHistoryItem[] {
  const stored = localStorage.getItem(SUMMARY_HISTORY_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  return [];
}

export function addSummaryHistory(item: Omit<SummaryHistoryItem, "id">): SummaryHistoryItem {
  const history = getSummaryHistory();
  const newItem: SummaryHistoryItem = {
    ...item,
    id: `summary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  };

  // Add to beginning of array (most recent first)
  history.unshift(newItem);

  // Keep only last 50 items
  const trimmedHistory = history.slice(0, 50);

  localStorage.setItem(SUMMARY_HISTORY_KEY, JSON.stringify(trimmedHistory));
  return newItem;
}

export function deleteSummaryHistory(id: string): boolean {
  const history = getSummaryHistory();
  const filtered = history.filter(h => h.id !== id);

  if (filtered.length === history.length) return false;

  localStorage.setItem(SUMMARY_HISTORY_KEY, JSON.stringify(filtered));
  return true;
}

export function clearSummaryHistory(): void {
  localStorage.removeItem(SUMMARY_HISTORY_KEY);
}

export function getSummaryHistoryById(id: string): SummaryHistoryItem | null {
  const history = getSummaryHistory();
  return history.find(h => h.id === id) || null;
}