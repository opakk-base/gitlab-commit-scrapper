import { useState, useEffect } from "react";
import {
  AppSettings,
  getAppSettings,
  saveAppSettings,
} from "../services/settings";

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(() =>
    getAppSettings()
  );

  useEffect(() => {
    saveAppSettings(settings);
  }, [settings]);

  const toggleSetting = (key: keyof AppSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Developer Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Developer Settings</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Debug Mode</p>
              <p className="text-sm text-gray-500">
                Show detailed error information and technical details
              </p>
            </div>
            <button
              onClick={() => toggleSetting("debugMode")}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.debugMode ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.debugMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {settings.debugMode && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
              <p className="font-medium">Debug Mode Enabled</p>
              <p className="mt-1">
                Error messages will now show full technical details including
                stack traces and raw API responses.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">General Settings</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Enable Notifications</p>
              <p className="text-sm text-gray-500">
                Receive desktop notifications
              </p>
            </div>
            <button
              onClick={() => toggleSetting("notifications")}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.notifications ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.notifications ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Dark Mode</p>
              <p className="text-sm text-gray-500">
                Use dark theme for the interface
              </p>
            </div>
            <button
              onClick={() => toggleSetting("darkMode")}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.darkMode ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.darkMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-800">Auto Update</p>
              <p className="text-sm text-gray-500">
                Automatically update the application
              </p>
            </div>
            <button
              onClick={() => toggleSetting("autoUpdate")}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.autoUpdate ? "bg-blue-500" : "bg-gray-300"
              }`}
            >
              <span
                className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  settings.autoUpdate ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Language Settings */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Language</h3>
        </div>
        <div className="p-4">
          <select
            value={settings.language}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, language: e.target.value }))
            }
            className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
            <option value="id">Indonesian</option>
          </select>
        </div>
      </div>

      {/* About Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">About</h3>
        </div>
        <div className="p-4 text-sm text-gray-600">
          <p>GitLab Commit Scraper v1.0.0</p>
          <p className="mt-1">Built with Electron, React, and Tailwind CSS</p>
        </div>
      </div>
    </div>
  );
}