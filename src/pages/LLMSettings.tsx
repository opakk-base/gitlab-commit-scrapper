import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  LLMConfig,
  LLMProviderCode,
  LLMTestResult,
  getLLMConfigs,
  addLLMConfig,
  updateLLMConfig,
  deleteLLMConfig,
  getActiveLLMConfigId,
  setActiveLLMConfigId,
  testLLMConnection,
  getAvailableModels,
} from "../services/llm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Server,
  HelpCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Pencil,
  Trash2,
  Check,
  Link2,
  RefreshCw,
  ChevronRight,
  ChevronLeft,
  X,
  AlertCircle,
} from "lucide-react";

interface ProviderInfo {
  code: LLMProviderCode;
  name: string;
  defaultUrl: string;
  icon: string;
  requiresKey: boolean;
  description?: string;
}

const providers: ProviderInfo[] = [
  { code: "openai", name: "OpenAI", defaultUrl: "https://api.openai.com/v1", icon: "🤖", requiresKey: true, description: "GPT-4, GPT-3.5, etc." },
  { code: "azure", name: "Azure OpenAI", defaultUrl: "", icon: "☁️", requiresKey: true, description: "Microsoft Azure deployment" },
  { code: "ollama", name: "Ollama", defaultUrl: "http://localhost:11434/v1", icon: "🦙", requiresKey: false, description: "Run models locally" },
  { code: "groq", name: "Groq", defaultUrl: "https://api.groq.com/openai/v1", icon: "⚡", requiresKey: true, description: "Ultra-fast inference" },
  { code: "together", name: "Together AI", defaultUrl: "https://api.together.xyz/v1", icon: "🤝", requiresKey: true, description: "Open-source models" },
  { code: "openrouter", name: "OpenRouter", defaultUrl: "https://openrouter.ai/api/v1", icon: "🔀", requiresKey: true, description: "Multiple providers" },
  { code: "custom", name: "Custom", defaultUrl: "", icon: "🔧", requiresKey: false, description: "Any OpenAI-compatible API" },
];

const getProviderInfo = (code: LLMProviderCode): ProviderInfo => {
  return providers.find(p => p.code === code) || providers[providers.length - 1];
};

interface StepperFormData {
  name: string;
  provider: LLMProviderCode;
  apiUrl: string;
  apiKey: string;
  models: string[];
  selectedModels: string[];
}

const defaultFormData: StepperFormData = {
  name: "",
  provider: "openai",
  apiUrl: "https://api.openai.com/v1",
  apiKey: "",
  models: [],
  selectedModels: [],
};

export default function LLMSettings() {
  const [configs, setConfigs] = useState<LLMConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<LLMConfig | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<StepperFormData>(defaultFormData);

  // Step 2 states
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);

  // Validation errors for each step
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // General states
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = () => {
    const loadedConfigs = getLLMConfigs();
    setConfigs(loadedConfigs);
    setActiveConfigId(getActiveLLMConfigId());
  };

  const handleOpenAddDialog = () => {
    setEditingConfig(null);
    setFormData(defaultFormData);
    setCurrentStep(1);
    setConnected(false);
    setError(null);
    setSuccess(null);
    setStepErrors({});
    setShowDialog(true);
  };

  const handleOpenEditDialog = (config: LLMConfig) => {
    const providerInfo = getProviderInfo(config.provider);
    setEditingConfig(config);
    setFormData({
      name: config.name,
      provider: config.provider,
      apiUrl: config.apiUrl,
      apiKey: config.apiKey,
      models: config.models || [],
      selectedModels: config.models || [config.model].filter(Boolean),
    });
    setCurrentStep(1);
    setConnected(true);
    setError(null);
    setSuccess(null);
    setStepErrors({});
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingConfig(null);
    setFormData(defaultFormData);
    setCurrentStep(1);
    setConnected(false);
    setError(null);
    setSuccess(null);
    setStepErrors({});
  };

  // Clear step error when field changes
  const clearStepError = (field: string) => {
    setStepErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  };

  // Validate Step 1
  const validateStep1 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Configuration name is required";
    }

    if (!formData.provider) {
      errors.provider = "Please select a provider";
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate Step 2
  const validateStep2 = (): boolean => {
    const errors: Record<string, string> = {};
    const providerInfo = getProviderInfo(formData.provider);

    if (!formData.apiUrl.trim()) {
      errors.apiUrl = "API URL is required";
    } else {
      // Validate URL format
      try {
        new URL(formData.apiUrl);
      } catch {
        errors.apiUrl = "Please enter a valid URL";
      }
    }

    if (providerInfo.requiresKey && !formData.apiKey.trim()) {
      errors.apiKey = "API key is required for this provider";
    }

    if (!connected) {
      errors.connection = "Please test the connection first";
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate Step 3
  const validateStep3 = (): boolean => {
    const errors: Record<string, string> = {};

    if (formData.selectedModels.length === 0) {
      errors.models = "Please select at least one model";
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Step 1: Select Provider
  const handleSelectProvider = (provider: ProviderInfo) => {
    setFormData((prev) => ({
      ...prev,
      provider: provider.code,
      apiUrl: provider.defaultUrl || prev.apiUrl,
      apiKey: provider.requiresKey ? prev.apiKey : "",
    }));
    clearStepError("provider");
  };

  // Step 2: Test Connection
  const handleTestConnection = async () => {
    const providerInfo = getProviderInfo(formData.provider);

    // Validate before testing
    const errors: Record<string, string> = {};
    if (!formData.apiUrl.trim()) {
      errors.apiUrl = "API URL is required";
      setStepErrors(errors);
      toast.error("Please enter an API URL");
      return;
    }

    // Validate URL format
    try {
      new URL(formData.apiUrl);
    } catch {
      errors.apiUrl = "Please enter a valid URL";
      setStepErrors(errors);
      toast.error("Please enter a valid URL");
      return;
    }

    if (providerInfo.requiresKey && !formData.apiKey.trim()) {
      errors.apiKey = "API key is required for this provider";
      setStepErrors(errors);
      toast.error("API key is required for this provider");
      return;
    }

    setTesting(true);
    setError(null);
    setSuccess(null);
    setConnected(false);
    clearStepError("connection");

    try {
      const tempConfig: LLMConfig = {
        id: "temp",
        name: formData.name,
        provider: formData.provider,
        apiUrl: formData.apiUrl.replace(/\/+$/, ""),
        apiKey: formData.apiKey,
        model: "",
      };

      const result: LLMTestResult = await testLLMConnection(tempConfig);
      if (result.success) {
        setConnected(true);
        toast.success("Connection successful!");

        // Fetch available models
        setLoadingModels(true);
        const models = await getAvailableModels(tempConfig);
        setFormData((prev) => ({ ...prev, models }));
        setLoadingModels(false);

        if (models.length > 0) {
          toast.success(`Found ${models.length} models available`);
        } else {
          toast.info("No models found via API. You can add them manually.");
        }
      } else {
        setStepErrors({ connection: result.error || "Connection failed" });
        toast.error(result.error || "Connection failed");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Connection test failed";
      setStepErrors({ connection: errorMsg });
      toast.error(errorMsg);
    } finally {
      setTesting(false);
    }
  };

  // Step 3: Toggle model selection
  const handleToggleModel = (model: string) => {
    setFormData((prev) => {
      const isSelected = prev.selectedModels.includes(model);
      return {
        ...prev,
        selectedModels: isSelected
          ? prev.selectedModels.filter((m) => m !== model)
          : [...prev.selectedModels, model],
      };
    });
    clearStepError("models");
  };

  // Add custom model
  const [customModel, setCustomModel] = useState("");
  const handleAddCustomModel = () => {
    if (customModel.trim() && !formData.selectedModels.includes(customModel.trim())) {
      setFormData((prev) => ({
        ...prev,
        selectedModels: [...prev.selectedModels, customModel.trim()],
        models: prev.models.includes(customModel.trim())
          ? prev.models
          : [...prev.models, customModel.trim()],
      }));
      setCustomModel("");
      clearStepError("models");
    }
  };

  // Remove model
  const handleRemoveModel = (model: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedModels: prev.selectedModels.filter((m) => m !== model),
    }));
  };

  // Navigation with validation
  const handleNext = () => {
    if (currentStep === 1) {
      if (!validateStep1()) {
        toast.error("Please fill in all required fields");
        return;
      }
    } else if (currentStep === 2) {
      if (!validateStep2()) {
        toast.error("Please complete all fields and test connection");
        return;
      }
    }

    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(1, prev - 1));
    setStepErrors({});
  };

  // Save configuration
  const handleSave = () => {
    if (!validateStep3()) {
      toast.error("Please select at least one model");
      return;
    }

    const normalizedUrl = formData.apiUrl.replace(/\/+$/, "");
    const primaryModel = formData.selectedModels[0];

    if (editingConfig) {
      updateLLMConfig(editingConfig.id, {
        name: formData.name,
        provider: formData.provider,
        apiUrl: normalizedUrl,
        apiKey: formData.apiKey,
        model: primaryModel,
        models: formData.selectedModels,
      });
      toast.success("Configuration updated successfully");
    } else {
      addLLMConfig({
        name: formData.name,
        provider: formData.provider,
        apiUrl: normalizedUrl,
        apiKey: formData.apiKey,
        model: primaryModel,
        models: formData.selectedModels,
      });
      toast.success("Configuration added successfully");
    }

    loadConfigs();
    handleCloseDialog();
  };

  // Delete configuration
  const handleDeleteConfig = (id: string) => {
    if (configs.length === 1) {
      toast.error("Cannot delete the last configuration");
      return;
    }

    if (confirm("Are you sure you want to delete this configuration?")) {
      deleteLLMConfig(id);
      loadConfigs();
      toast.success("Configuration deleted");
    }
  };

  // Select configuration
  const handleSelectConfig = (id: string) => {
    setActiveLLMConfigId(id);
    setActiveConfigId(id);
    toast.success("Configuration selected");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Configurations List */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">LLM Configurations</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Manage multiple LLM providers
            </p>
          </div>
          <Button onClick={handleOpenAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Config
          </Button>
        </div>

        {configs.length === 0 ? (
          <div className="p-8 text-center">
            <Server className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No LLM configurations yet</p>
            <Button onClick={handleOpenAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Config
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {configs.map((config) => {
              const providerInfo = getProviderInfo(config.provider);
              return (
                <div
                  key={config.id}
                  className={`p-4 ${config.id === activeConfigId ? "bg-primary/5" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <button
                        onClick={() => handleSelectConfig(config.id)}
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                          config.id === activeConfigId
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-muted-foreground hover:border-primary"
                        }`}
                      >
                        {config.id === activeConfigId && <Check className="h-3 w-3" />}
                      </button>
                      <span className="text-2xl">{providerInfo.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{config.name}</p>
                          {config.id === activeConfigId && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                              Active
                            </span>
                          )}
                          {config.provider === "ollama" && (
                            <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded">
                              Local
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {providerInfo.name} • {config.apiUrl}
                        </p>
                        {config.model && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Model: {config.model}
                            {config.models && config.models.length > 1 && ` (+${config.models.length - 1} more)`}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditDialog(config)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteConfig(config.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Help
          </h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <span>🦙</span> Ollama (Local)
            </h4>
            <p className="text-sm text-muted-foreground mt-2">
              Run models locally without API keys. Default: <code className="bg-muted px-1 rounded">http://localhost:11434/v1</code>
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Can also use custom URL for deployed Ollama instances.
            </p>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <span>🔧</span> Custom Provider
            </h4>
            <p className="text-sm text-muted-foreground mt-2">
              Use any OpenAI-compatible API (vLLM, LocalAI, LM Studio, etc.)
            </p>
          </div>
        </div>
      </div>

      {/* Stepper Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent resizable className="flex flex-col p-0 max-w-xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle>
              {editingConfig ? "Edit Configuration" : "Add Configuration"}
            </DialogTitle>
            <DialogDescription>
              Step {currentStep} of 3
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="px-6 pt-4">
            <div className="flex items-center justify-between">
              {[
                { num: 1, label: "Provider" },
                { num: 2, label: "Connection" },
                { num: 3, label: "Models" },
              ].map((step, idx) => (
                <div key={step.num} className="flex items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep >= step.num
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {currentStep > step.num ? <Check className="h-4 w-4" /> : step.num}
                    </div>
                    <span className={`text-sm ${currentStep >= step.num ? "text-foreground" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                  {idx < 2 && (
                    <div className={`w-12 h-0.5 mx-2 ${currentStep > step.num ? "bg-primary" : "bg-muted"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Step 1: Choose Provider */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Configuration Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, name: e.target.value }));
                      clearStepError("name");
                    }}
                    placeholder="e.g., Work OpenAI, Local Ollama, Production Ollama"
                    className={stepErrors.name ? "border-destructive" : ""}
                  />
                  {stepErrors.name && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {stepErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Select Provider <span className="text-destructive">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {providers.map((provider) => (
                      <button
                        key={provider.code}
                        onClick={() => handleSelectProvider(provider)}
                        className={`p-3 text-sm rounded-lg border transition-colors text-left ${
                          formData.provider === provider.code
                            ? "border-primary bg-primary/5"
                            : stepErrors.provider
                              ? "border-destructive bg-muted/50 hover:bg-muted"
                              : "border-border bg-muted/50 hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{provider.icon}</span>
                          <div>
                            <p className="font-medium">{provider.name}</p>
                            <p className="text-xs text-muted-foreground">{provider.description}</p>
                          </div>
                        </div>
                        {!provider.requiresKey && (
                          <span className="text-[10px] text-green-600 mt-1 block">No API key needed</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {stepErrors.provider && (
                    <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {stepErrors.provider}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Connection Details */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-3">
                  <span className="text-2xl">{getProviderInfo(formData.provider).icon}</span>
                  <div>
                    <p className="font-medium">{getProviderInfo(formData.provider).name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getProviderInfo(formData.provider).requiresKey ? "API key required" : "No API key needed"}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    API URL <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formData.apiUrl}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, apiUrl: e.target.value }));
                      setConnected(false);
                      clearStepError("apiUrl");
                    }}
                    placeholder={getProviderInfo(formData.provider).defaultUrl || "Enter API URL"}
                    className={stepErrors.apiUrl ? "border-destructive" : ""}
                  />
                  {stepErrors.apiUrl && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {stepErrors.apiUrl}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.provider === "ollama" && "Default: http://localhost:11434/v1. Change if using deployed Ollama."}
                    {formData.provider === "custom" && "Enter your OpenAI-compatible API endpoint."}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    API Key
                    {getProviderInfo(formData.provider).requiresKey && (
                      <span className="text-destructive"> *</span>
                    )}
                    {!getProviderInfo(formData.provider).requiresKey && (
                      <span className="text-muted-foreground font-normal"> (Optional)</span>
                    )}
                  </label>
                  <Input
                    type="password"
                    value={formData.apiKey}
                    onChange={(e) => {
                      setFormData((prev) => ({ ...prev, apiKey: e.target.value }));
                      clearStepError("apiKey");
                    }}
                    placeholder={getProviderInfo(formData.provider).requiresKey ? "sk-..." : "Not required"}
                    className={stepErrors.apiKey ? "border-destructive" : ""}
                  />
                  {stepErrors.apiKey && (
                    <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {stepErrors.apiKey}
                    </p>
                  )}
                </div>

                {/* Test Connection */}
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      onClick={handleTestConnection}
                      disabled={testing || !formData.apiUrl.trim()}
                    >
                      {testing ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <Link2 className="h-4 w-4 mr-2" />
                          Test Connection
                        </>
                      )}
                    </Button>
                    {connected && (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-5 w-5" />
                        <span>Connected</span>
                      </div>
                    )}
                  </div>
                  {stepErrors.connection && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                      <p className="text-destructive text-sm">{stepErrors.connection}</p>
                    </div>
                  )}
                </div>

                {loadingModels && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading available models...</span>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Select Models */}
            {currentStep === 3 && (
              <div className="space-y-4">
                {stepErrors.models && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-0.5" />
                    <p className="text-destructive text-sm">{stepErrors.models}</p>
                  </div>
                )}

                {formData.models.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Available Models ({formData.models.length}) <span className="text-destructive">*</span>
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-border rounded-lg">
                      {formData.models.map((model) => (
                        <div
                          key={model}
                          onClick={() => handleToggleModel(model)}
                          className={`p-2 flex items-center gap-2 cursor-pointer border-b border-border last:border-b-0 ${
                            formData.selectedModels.includes(model) ? "bg-primary/10" : "hover:bg-muted/50"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded border flex items-center justify-center ${
                              formData.selectedModels.includes(model)
                                ? "bg-primary border-primary text-primary-foreground"
                                : "border-muted-foreground"
                            }`}
                          >
                            {formData.selectedModels.includes(model) && <Check className="h-3 w-3" />}
                          </div>
                          <span className="text-sm">{model}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Add Custom Model */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Add Custom Model
                  </label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={customModel}
                      onChange={(e) => setCustomModel(e.target.value)}
                      placeholder="e.g., gpt-4o, llama3"
                      onKeyDown={(e) => e.key === "Enter" && handleAddCustomModel()}
                    />
                    <Button variant="outline" onClick={handleAddCustomModel}>
                      Add
                    </Button>
                  </div>
                </div>

                {/* Selected Models */}
                {formData.selectedModels.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Selected Models ({formData.selectedModels.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {formData.selectedModels.map((model) => (
                        <span
                          key={model}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm"
                        >
                          {model}
                          <button
                            onClick={() => handleRemoveModel(model)}
                            className="hover:text-primary/70"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      First model will be used as default: <strong>{formData.selectedModels[0]}</strong>
                    </p>
                  </div>
                )}

                {formData.selectedModels.length === 0 && formData.models.length === 0 && (
                  <div className="p-4 bg-muted/50 rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">
                      No models found from API. Please add at least one model manually.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={currentStep === 1 ? !formData.provider : (currentStep === 2 ? !connected : false)}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={formData.selectedModels.length === 0}
              >
                {editingConfig ? "Save Changes" : "Add Configuration"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}