import { useState, useEffect } from "react";
import {
  GitLabConfig,
  getGitLabConfigs,
  addGitLabConfig,
  updateGitLabConfig,
  deleteGitLabConfig,
  getActiveGitLabConfigId,
  setActiveGitLabConfigId,
  testGitLabConnection,
  GitLabApiError,
  GitLabError,
} from "../services/gitlab";
import { isDebugMode } from "../services/settings";
import ErrorDisplay from "../components/ErrorDisplay";
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
  Plus,
  Pencil,
  Trash2,
  Check,
  Server,
  Link2,
  User,
  RefreshCw,
} from "lucide-react";

interface ConfigFormData {
  name: string;
  url: string;
  pat: string;
}

const defaultFormData: ConfigFormData = {
  name: "",
  url: "",
  pat: "",
};

export default function GitLabSettings() {
  const [configs, setConfigs] = useState<GitLabConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<{
    name: string;
    username: string;
    email: string;
  } | null>(null);
  const [gitlabVersion, setGitlabVersion] = useState<string | null>(null);

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<GitLabConfig | null>(null);
  const [formData, setFormData] = useState<ConfigFormData>(defaultFormData);

  // Loading/error states
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState<GitLabError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = () => {
    const loadedConfigs = getGitLabConfigs();
    setConfigs(loadedConfigs);
    setActiveConfigId(getActiveGitLabConfigId());
  };

  const handleOpenAddDialog = () => {
    setEditingConfig(null);
    setFormData(defaultFormData);
    setError(null);
    setSuccess(null);
    setShowDialog(true);
  };

  const handleOpenEditDialog = (config: GitLabConfig) => {
    setEditingConfig(config);
    setFormData({
      name: config.name,
      url: config.url,
      pat: config.pat,
    });
    setError(null);
    setSuccess(null);
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingConfig(null);
    setFormData(defaultFormData);
    setError(null);
    setSuccess(null);
  };

  const handleSaveConfig = () => {
    if (!formData.name.trim()) {
      setError({
        code: "VALIDATION_ERROR",
        message: "Please enter a configuration name",
        suggestion:
          "Give this configuration a memorable name like 'Work GitLab' or 'Personal Projects'.",
      });
      return;
    }

    if (!formData.url.trim() || !formData.pat.trim()) {
      setError({
        code: "VALIDATION_ERROR",
        message: "Please fill in all fields",
        suggestion: "Both GitLab URL and Personal Access Token are required.",
      });
      return;
    }

    const normalizedUrl = formData.url.replace(/\/+$/, "");

    if (editingConfig) {
      // Update existing config
      updateGitLabConfig(editingConfig.id, {
        name: formData.name,
        url: normalizedUrl,
        pat: formData.pat,
      });
      setSuccess("Configuration updated successfully");
    } else {
      // Add new config
      addGitLabConfig({
        name: formData.name,
        url: normalizedUrl,
        pat: formData.pat,
      });
      setSuccess("Configuration added successfully");
    }

    loadConfigs();
    handleCloseDialog();
  };

  const handleTestConnection = async (config: GitLabConfig) => {
    setTesting(config.id);
    setError(null);
    setSuccess(null);
    setUserInfo(null);
    setGitlabVersion(null);

    try {
      const result = await testGitLabConnection(config);
      setUserInfo(result.user);
      setGitlabVersion(result.version || null);
      setSuccess("Connection successful!");
    } catch (err) {
      if (err instanceof GitLabApiError) {
        setError(err.gitlabError);
      } else if (err instanceof Error) {
        setError({
          code: "UNKNOWN_ERROR",
          message: err.message,
          suggestion: "An unexpected error occurred. Please try again.",
        });
      }
    } finally {
      setTesting(null);
    }
  };

  const handleDeleteConfig = (id: string) => {
    if (configs.length === 1) {
      setError({
        code: "VALIDATION_ERROR",
        message: "Cannot delete the last configuration",
        suggestion:
          "You must have at least one GitLab configuration. Add a new one before deleting this.",
      });
      return;
    }

    if (confirm("Are you sure you want to delete this configuration?")) {
      deleteGitLabConfig(id);
      loadConfigs();
      setSuccess("Configuration deleted");
    }
  };

  const handleSelectConfig = (id: string) => {
    setActiveGitLabConfigId(id);
    setActiveConfigId(id);
    const config = configs.find((c) => c.id === id);
    if (config) {
      setUserInfo(null);
      setGitlabVersion(null);
    }
    setSuccess("Configuration selected");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Configurations List */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              GitLab Configurations
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Manage multiple GitLab instances
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
            <p className="text-muted-foreground mb-4">
              No GitLab configurations yet
            </p>
            <Button onClick={handleOpenAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Config
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {configs.map((config) => (
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
                      {config.id === activeConfigId && (
                        <Check className="h-3 w-3" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">
                          {config.name}
                        </p>
                        {config.id === activeConfigId && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {config.url}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleTestConnection(config)}
                      disabled={testing === config.id}
                    >
                      {testing === config.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Link2 className="h-4 w-4" />
                      )}
                    </Button>
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
            ))}
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && <ErrorDisplay error={error} />}

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600" />
            <p className="text-green-700 dark:text-green-300">{success}</p>
          </div>
        </div>
      )}

      {/* User Info (for tested config) */}
      {userInfo && (
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">
                Connected as {userInfo.name}
              </p>
              <p className="text-sm text-muted-foreground">
                @{userInfo.username} • {userInfo.email}
                {gitlabVersion && ` • GitLab ${gitlabVersion}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-card rounded-lg border border-border">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">
            How to Get a PAT
          </h3>
        </div>
        <div className="p-4 text-sm text-muted-foreground space-y-2">
          <p>1. Go to your GitLab instance → User Settings → Access Tokens</p>
          <p>
            2. Create a token with{" "}
            <code className="bg-muted px-1 rounded">read_api</code> and{" "}
            <code className="bg-muted px-1 rounded">read_repository</code>{" "}
            scopes
          </p>
          <p>3. Copy the token and paste it in the configuration</p>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent resizable className="flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <DialogTitle>
              {editingConfig ? "Edit Configuration" : "Add Configuration"}
            </DialogTitle>
            <DialogDescription>
              {editingConfig
                ? "Update your GitLab configuration details"
                : "Add a new GitLab instance to manage"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Configuration Name
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Work GitLab, Personal Projects"
              />
              <p className="text-xs text-muted-foreground mt-1">
                A friendly name to identify this GitLab instance
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                GitLab URL
              </label>
              <Input
                type="text"
                value={formData.url}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, url: e.target.value }))
                }
                placeholder="https://gitlab.example.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your GitLab instance URL
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Personal Access Token (PAT)
              </label>
              <Input
                type="password"
                value={formData.pat}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, pat: e.target.value }))
                }
                placeholder="glpat-xxxxxxxxxxxx"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Token with{" "}
                <code className="bg-muted px-1 rounded">read_api</code> and{" "}
                <code className="bg-muted px-1 rounded">read_repository</code>{" "}
                scopes
              </p>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border bg-muted/30">
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSaveConfig}>
              {editingConfig ? "Save Changes" : "Add Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debug Mode Notice */}
      {isDebugMode() && (
        <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔧</span>
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-300">
                Debug Mode Active
              </p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                Full error details, stack traces, and raw API responses will be
                displayed.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
