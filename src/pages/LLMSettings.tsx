import { useState, useEffect } from "react";
import {
  LLMConfig,
  LLMTestResult,
  getLLMConfig,
  saveLLMConfig,
  clearLLMConfig,
  testLLMConnection,
  getAvailableModels,
} from "../services/llm";

export default function LLMSettings() {
  const [config, setConfig] = useState<LLMConfig>(() => getLLMConfig());
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<{ message: string; suggestion?: string } | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Load available models if config exists
    if (config.apiUrl && config.apiKey) {
      loadModels();
    }
  }, []);

  const loadModels = async () => {
    setLoading(true);
    const models = await getAvailableModels(config);
    setAvailableModels(models);
    setLoading(false);
  };

  const handleSave = () => {
    if (!config.apiUrl || !config.apiKey) {
      setError({ message: "Please fill in API URL and API Key" });
      return;
    }

    // Normalize URL (remove trailing slash)
    const normalizedUrl = config.apiUrl.replace(/\/+$/, "");
    saveLLMConfig({ ...config, apiUrl: normalizedUrl });
    setSuccess("Configuration saved successfully");
    setError(null);
  };

  const handleTestConnection = async () => {
    if (!config.apiUrl || !config.apiKey) {
      setError({ message: "Please fill in API URL and API Key first" });
      return;
    }

    setTesting(true);
    setError(null);
    setSuccess(null);

    try {
      const result: LLMTestResult = await testLLMConnection(config);
      if (result.success) {
        setSuccess("Connection successful! API is accessible.");
        await loadModels();
      } else {
        setError({
          message: result.error || "Connection failed",
          suggestion: result.suggestion,
        });
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : "Connection test failed",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    clearLLMConfig();
    setConfig({ apiUrl: "https://api.openai.com/v1", apiKey: "", model: "gpt-3.5-turbo" });
    setAvailableModels([]);
    setSuccess("Configuration cleared");
    setError(null);
  };

  const commonProviders = [
    { name: "OpenAI", url: "https://api.openai.com/v1" },
    { name: "Azure OpenAI", url: "" },
    { name: "Ollama (Local)", url: "http://localhost:11434/v1" },
    { name: "Groq", url: "https://api.groq.com/openai/v1" },
    { name: "Together AI", url: "https://api.together.xyz/v1" },
    { name: "OpenRouter", url: "https://openrouter.ai/api/v1" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* LLM Configuration */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">LLM API Configuration</h3>
        </div>
        <div className="p-4 space-y-4">
          {/* Provider Presets */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider Presets
            </label>
            <div className="flex flex-wrap gap-2">
              {commonProviders.map((provider) => (
                <button
                  key={provider.name}
                  onClick={() =>
                    setConfig((prev) => ({
                      ...prev,
                      apiUrl: provider.url,
                      model: "",
                    }))
                  }
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {provider.name}
                </button>
              ))}
            </div>
          </div>

          {/* API URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API URL
            </label>
            <input
              type="text"
              value={config.apiUrl}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, apiUrl: e.target.value }))
              }
              placeholder="https://api.openai.com/v1"
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              OpenAI-compatible API endpoint URL
            </p>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, apiKey: e.target.value }))
              }
              placeholder="sk-..."
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your API key (stored locally, never sent to our servers)
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            {availableModels.length > 0 ? (
              <select
                value={config.model}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, model: e.target.value }))
                }
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a model</option>
                {availableModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={config.model}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, model: e.target.value }))
                }
                placeholder="gpt-3.5-turbo"
                className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
            <p className="text-xs text-gray-500 mt-1">
              {loading
                ? "Loading models..."
                : "Enter model name manually or test connection to load available models"}
            </p>
          </div>

          {/* Status Messages */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm font-medium">{error.message}</p>
              {error.suggestion && (
                <p className="text-red-600 text-xs mt-1">💡 {error.suggestion}</p>
              )}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Save
            </button>
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {testing ? "Testing..." : "Test Connection"}
            </button>
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Supported Providers</h3>
        </div>
        <div className="p-4 text-sm text-gray-600 space-y-3">
          <div>
            <p className="font-medium text-gray-800">OpenAI</p>
            <p>Get your API key from platform.openai.com</p>
          </div>
          <div>
            <p className="font-medium text-gray-800">Ollama (Local)</p>
            <p>Run models locally with Ollama. Default URL: http://localhost:11434/v1</p>
          </div>
          <div>
            <p className="font-medium text-gray-800">Groq</p>
            <p>Fast inference at console.groq.com</p>
          </div>
          <div>
            <p className="font-medium text-gray-800">Other OpenAI-Compatible APIs</p>
            <p>Any API that follows the OpenAI chat completions format should work</p>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Troubleshooting</h3>
        </div>
        <div className="p-4 text-sm text-gray-600 space-y-3">
          <div>
            <p className="font-medium text-gray-800">CORS / Network Errors</p>
            <p>If you see network errors, the app has been configured to allow all external connections. Make sure you've restarted the app after changes.</p>
          </div>
          <div>
            <p className="font-medium text-gray-800">Ollama Not Working</p>
            <p>Ensure Ollama is running: <code className="bg-gray-100 px-1 rounded">ollama serve</code>. Use http://localhost:11434/v1 as the URL.</p>
          </div>
          <div>
            <p className="font-medium text-gray-800">Invalid API Key</p>
            <p>Double-check your API key. For OpenAI, it should start with "sk-". Some providers may use different formats.</p>
          </div>
        </div>
      </div>

      {/* Current Config Display */}
      {config.apiKey && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-800 mb-2">Current Configuration</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>
              • API URL: <code className="bg-gray-200 px-1 rounded">{config.apiUrl}</code>
            </li>
            <li>
              • Model: <code className="bg-gray-200 px-1 rounded">{config.model || "Not set"}</code>
            </li>
            <li>
              • API Key: <code className="bg-gray-200 px-1 rounded">{config.apiKey ? "••••••••" + config.apiKey.slice(-4) : "Not set"}</code>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}