const APP_SETTINGS_KEY = "app_settings";

export interface AppSettings {
  debugMode: boolean;
  notifications: boolean;
  darkMode: boolean;
  autoUpdate: boolean;
  language: string;
}

const defaultSettings: AppSettings = {
  debugMode: false,
  notifications: true,
  darkMode: false,
  autoUpdate: true,
  language: "en",
};

export function getAppSettings(): AppSettings {
  const stored = localStorage.getItem(APP_SETTINGS_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...parsed };
    } catch {
      return defaultSettings;
    }
  }
  return defaultSettings;
}

export function saveAppSettings(settings: AppSettings): void {
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
}

export function updateAppSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): void {
  const current = getAppSettings();
  saveAppSettings({ ...current, [key]: value });
}

export function isDebugMode(): boolean {
  return getAppSettings().debugMode;
}