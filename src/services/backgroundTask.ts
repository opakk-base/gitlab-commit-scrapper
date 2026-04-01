const BACKGROUND_TASK_KEY = "background_task";

export interface BackgroundTask {
  id: string;
  type: "summary" | "refine";
  status: "running" | "completed" | "error";
  progress: number; // 0-100
  message: string;
  startedAt: string;
  completedAt?: string;
  error?: string;
  result?: {
    summary?: string;
    modelUsed?: string;
    configName?: string;
    configId?: string;
    totalCommits?: number;
    projectStats?: {
      totalCommits: number;
      uniqueContributors: number;
      uniqueProjects: number;
      filesWithChanges: number;
    };
    scrapeDateRange?: {
      since: string;
      until: string;
    };
  };
  cancelRequested?: boolean;
}

type TaskSubscriber = (task: BackgroundTask | null) => void;

class BackgroundTaskManager {
  private subscribers: Set<TaskSubscriber> = new Set();
  private abortController: AbortController | null = null;

  generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  startBackgroundTask(task: Omit<BackgroundTask, "id">): BackgroundTask {
    const newTask: BackgroundTask = {
      ...task,
      id: this.generateId(),
    };
    this.saveTask(newTask);
    this.notifySubscribers(newTask);
    return newTask;
  }

  updateBackgroundTask(id: string, updates: Partial<BackgroundTask>): BackgroundTask | null {
    const task = this.getBackgroundTask();
    if (!task || task.id !== id) return null;

    const updatedTask: BackgroundTask = {
      ...task,
      ...updates,
    };
    this.saveTask(updatedTask);
    this.notifySubscribers(updatedTask);
    return updatedTask;
  }

  getBackgroundTask(): BackgroundTask | null {
    const stored = localStorage.getItem(BACKGROUND_TASK_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return null;
      }
    }
    return null;
  }

  clearBackgroundTask(): void {
    localStorage.removeItem(BACKGROUND_TASK_KEY);
    this.abortController = null;
    this.notifySubscribers(null);
  }

  subscribeToTask(callback: TaskSubscriber): () => void {
    this.subscribers.add(callback);
    // Immediately call with current task
    callback(this.getBackgroundTask());
    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(task: BackgroundTask | null): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(task);
      } catch (err) {
        console.error("Error in task subscriber:", err);
      }
    });
  }

  private saveTask(task: BackgroundTask): void {
    localStorage.setItem(BACKGROUND_TASK_KEY, JSON.stringify(task));
  }

  // Abort controller for cancelling ongoing fetch requests
  setAbortController(controller: AbortController): void {
    this.abortController = controller;
  }

  getAbortController(): AbortController | null {
    return this.abortController;
  }

  requestCancel(): void {
    const task = this.getBackgroundTask();
    if (task && task.status === "running") {
      this.updateBackgroundTask(task.id, { cancelRequested: true });
      this.abortController?.abort();
    }
  }

  isTaskRunning(): boolean {
    const task = this.getBackgroundTask();
    return task?.status === "running";
  }

  isTaskCompleted(): boolean {
    const task = this.getBackgroundTask();
    return task?.status === "completed";
  }

  hasError(): boolean {
    const task = this.getBackgroundTask();
    return task?.status === "error";
  }
}

// Singleton instance
export const backgroundTaskManager = new BackgroundTaskManager();

// Convenience exports
export const startBackgroundTask = (task: Omit<BackgroundTask, "id">) =>
  backgroundTaskManager.startBackgroundTask(task);
export const updateBackgroundTask = (id: string, updates: Partial<BackgroundTask>) =>
  backgroundTaskManager.updateBackgroundTask(id, updates);
export const getBackgroundTask = () => backgroundTaskManager.getBackgroundTask();
export const clearBackgroundTask = () => backgroundTaskManager.clearBackgroundTask();
export const subscribeToTask = (callback: TaskSubscriber) =>
  backgroundTaskManager.subscribeToTask(callback);
export const requestCancelTask = () => backgroundTaskManager.requestCancel();
export const isTaskRunning = () => backgroundTaskManager.isTaskRunning();
export const setAbortController = (controller: AbortController) =>
  backgroundTaskManager.setAbortController(controller);
export const getAbortController = () => backgroundTaskManager.getAbortController();