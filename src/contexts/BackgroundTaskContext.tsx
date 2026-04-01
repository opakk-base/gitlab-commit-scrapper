import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  BackgroundTask,
  backgroundTaskManager,
  getBackgroundTask,
  clearBackgroundTask,
  subscribeToTask,
} from "@/services/backgroundTask";

interface BackgroundTaskContextType {
  task: BackgroundTask | null;
  clearTask: () => void;
  updateProgress: (progress: number, message: string) => void;
  completeTask: (result: BackgroundTask["result"]) => void;
  failTask: (error: string) => void;
}

const BackgroundTaskContext = createContext<BackgroundTaskContextType | undefined>(undefined);

export function BackgroundTaskProvider({ children }: { children: ReactNode }) {
  const [task, setTask] = useState<BackgroundTask | null>(null);

  useEffect(() => {
    // Subscribe to task changes
    const unsubscribe = subscribeToTask((newTask) => {
      setTask(newTask);
    });

    // Load initial task
    const initialTask = getBackgroundTask();
    if (initialTask) {
      setTask(initialTask);
    }

    return unsubscribe;
  }, []);

  const clearTask = useCallback(() => {
    clearBackgroundTask();
    setTask(null);
  }, []);

  const updateProgress = useCallback((progress: number, message: string) => {
    if (task) {
      backgroundTaskManager.updateBackgroundTask(task.id, { progress, message });
    }
  }, [task]);

  const completeTask = useCallback((result: BackgroundTask["result"]) => {
    if (task) {
      backgroundTaskManager.updateBackgroundTask(task.id, {
        status: "completed",
        progress: 100,
        message: "Task completed successfully",
        completedAt: new Date().toISOString(),
        result,
      });
    }
  }, [task]);

  const failTask = useCallback((error: string) => {
    if (task) {
      backgroundTaskManager.updateBackgroundTask(task.id, {
        status: "error",
        error,
        completedAt: new Date().toISOString(),
      });
    }
  }, [task]);

  return (
    <BackgroundTaskContext.Provider
      value={{
        task,
        clearTask,
        updateProgress,
        completeTask,
        failTask,
      }}
    >
      {children}
    </BackgroundTaskContext.Provider>
  );
}

export function useBackgroundTask() {
  const context = useContext(BackgroundTaskContext);
  if (context === undefined) {
    throw new Error("useBackgroundTask must be used within a BackgroundTaskProvider");
  }
  return context;
}