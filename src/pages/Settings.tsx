import { useState, useEffect } from "react";
import {
  AppSettings,
  getAppSettings,
  saveAppSettings,
} from "../services/settings";
import { useTheme } from "@/components/ThemeProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Settings2, Globe, Info, Moon, Sun } from "lucide-react";

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(() =>
    getAppSettings()
  );
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    saveAppSettings(settings);
  }, [settings]);

  const toggleSetting = (key: keyof AppSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const ToggleSwitch = ({
    enabled,
    onChange,
    label,
    description
  }: {
    enabled: boolean;
    onChange: () => void;
    label: string;
    description: string;
  }) => (
    <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
      <div className="flex-1 mr-4">
        <p className="font-medium text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        onClick={onChange}
        className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
          enabled ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`block w-5 h-5 bg-background rounded-full shadow transition-transform ${
            enabled ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="developer" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">Developer</span>
          </TabsTrigger>
          <TabsTrigger value="language" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">Language</span>
          </TabsTrigger>
          <TabsTrigger value="about" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            <span className="hidden sm:inline">About</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-4 mt-4">
          <div className="bg-card rounded-lg border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">General Settings</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure your application preferences
              </p>
            </div>
            <div className="p-4 space-y-3">
              <ToggleSwitch
                enabled={settings.notifications}
                onChange={() => toggleSetting("notifications")}
                label="Enable Notifications"
                description="Receive desktop notifications for important events"
              />

              {/* Dark Mode Toggle */}
              <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
                <div className="flex-1 mr-4">
                  <p className="font-medium text-foreground">Dark Mode</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Use dark theme for the interface
                  </p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`w-12 h-6 rounded-full transition-colors flex-shrink-0 ${
                    theme === "dark" ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`block w-5 h-5 bg-background rounded-full shadow transition-transform flex items-center justify-center ${
                      theme === "dark" ? "translate-x-6" : "translate-x-1"
                    }`}
                  >
                    {theme === "dark" ? (
                      <Moon className="h-3 w-3 text-primary" />
                    ) : (
                      <Sun className="h-3 w-3 text-muted-foreground" />
                    )}
                  </span>
                </button>
              </div>

              <ToggleSwitch
                enabled={settings.autoUpdate}
                onChange={() => toggleSetting("autoUpdate")}
                label="Auto Update"
                description="Automatically download and install updates"
              />
            </div>
          </div>
        </TabsContent>

        {/* Developer Settings Tab */}
        <TabsContent value="developer" className="space-y-4 mt-4">
          <div className="bg-card rounded-lg border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Developer Settings</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Tools for debugging and troubleshooting
              </p>
            </div>
            <div className="p-4 space-y-4">
              <ToggleSwitch
                enabled={settings.debugMode}
                onChange={() => toggleSetting("debugMode")}
                label="Debug Mode"
                description="Show detailed error information, stack traces, and raw API responses"
              />

              {settings.debugMode && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🔧</span>
                    <div>
                      <p className="font-medium text-yellow-800 dark:text-yellow-300">
                        Debug Mode Enabled
                      </p>
                      <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                        Error messages will now show full technical details including
                        stack traces and raw API responses. This may expose sensitive
                        information in error messages.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium text-foreground mb-2">What Debug Mode Shows</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Full error stack traces</li>
                  <li>• Raw API request/response data</li>
                  <li>• Detailed connection information</li>
                  <li>• Internal error codes and messages</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Language Tab */}
        <TabsContent value="language" className="space-y-4 mt-4">
          <div className="bg-card rounded-lg border border-border">
            <div className="p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Language & Region</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Set your preferred language
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Display Language
                </label>
                <select
                  value={settings.language}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, language: e.target.value }))
                  }
                  className="w-full p-3 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="en">🇺🇸 English</option>
                  <option value="es">🇪🇸 Español (Spanish)</option>
                  <option value="fr">🇫🇷 Français (French)</option>
                  <option value="de">🇩🇪 Deutsch (German)</option>
                  <option value="id">🇮🇩 Bahasa Indonesia</option>
                </select>
                <p className="text-xs text-muted-foreground mt-2">
                  Note: Language changes will take effect after restarting the application.
                </p>
              </div>

              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Want to help translate this app? Contributions are welcome!
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about" className="space-y-4 mt-4">
          <div className="bg-card rounded-lg border border-border">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🦊</span>
              </div>
              <h2 className="text-xl font-bold text-foreground">GitLab Commit Scraper</h2>
              <p className="text-muted-foreground mt-1">Version 1.0.0</p>
            </div>
            <div className="border-t border-border p-4">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">Built With</h4>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">Electron</span>
                    <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">React</span>
                    <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">TypeScript</span>
                    <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">Tailwind CSS</span>
                    <span className="px-2 py-1 bg-muted text-muted-foreground rounded text-xs">shadcn/ui</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• GitLab commit scraping with branch filtering</li>
                    <li>• AI-powered commit summaries</li>
                    <li>• Export to TXT, CSV, PDF, and DOCX</li>
                    <li>• Custom prompt templates</li>
                    <li>• Multiple LLM provider support</li>
                  </ul>
                </div>

                <div className="pt-2 border-t border-border">
                  <p className="text-xs text-muted-foreground">
                    This application is open source and provided "as is" without warranty of any kind.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-lg border border-border p-4">
            <h4 className="font-medium text-foreground mb-2">System Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-muted-foreground">Platform:</div>
              <div className="text-foreground">{navigator.platform}</div>
              <div className="text-muted-foreground">User Agent:</div>
              <div className="text-foreground text-xs truncate">{navigator.userAgent.split(' ').slice(0, 2).join(' ')}</div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}