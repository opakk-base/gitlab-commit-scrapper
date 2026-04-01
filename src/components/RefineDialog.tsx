import { useState, useEffect } from "react";
import { Wand2, Sparkles, RefreshCw, Pencil, ChevronDown, Check, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LLMConfig, getAvailableModels } from "@/services/llm";

export type RefineStyle = "professional" | "casual" | "concise" | "custom";

export interface RefineResult {
  style: RefineStyle;
  model: string;
  customPrompt?: string;
}

export interface RefineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefine: (result: RefineResult) => void;
  llmConfig: LLMConfig | null;
  isRefining?: boolean;
  title?: string;
  description?: string;
}

const styleOptions: { value: RefineStyle; label: string; description: string }[] = [
  {
    value: "professional",
    label: "Professional",
    description: "Maintains formal business tone while removing robotic phrasing.",
  },
  {
    value: "casual",
    label: "Casual",
    description: "Makes the summary friendlier and more conversational.",
  },
  {
    value: "concise",
    label: "Concise",
    description: "Focuses on clarity and brevity, removing unnecessary words.",
  },
  {
    value: "custom",
    label: "Custom",
    description: "Write your own instructions for how the AI should refine the text.",
  },
];

const defaultCustomPrompt = `Rewrite the following summary to make it sound more natural and human-written. Keep all the important information but improve the flow and readability. Use clear, engaging language that a real person would write.`;

export function RefineDialog({
  open,
  onOpenChange,
  onRefine,
  llmConfig,
  isRefining = false,
  title = "Refine Summary",
  description = "Select a style for humanizing the summary. The AI will rewrite the content to sound more natural and human-written.",
}: RefineDialogProps) {
  const [selectedStyle, setSelectedStyle] = useState<RefineStyle>("professional");
  const [customPrompt, setCustomPrompt] = useState(defaultCustomPrompt);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);

  // Load available models when dialog opens
  useEffect(() => {
    if (open && llmConfig) {
      setSelectedModel(llmConfig.model);
      loadModels(llmConfig);
    }
  }, [open, llmConfig]);

  // Update selected model when config changes
  useEffect(() => {
    if (llmConfig && !selectedModel) {
      setSelectedModel(llmConfig.model);
    }
  }, [llmConfig, selectedModel]);

  const loadModels = async (config: LLMConfig) => {
    setLoadingModels(true);
    try {
      const models = await getAvailableModels(config);
      if (models.length > 0) {
        setAvailableModels(models);
      } else {
        // Fallback to models from config or current model
        setAvailableModels(config.models || [config.model].filter(Boolean));
      }
    } catch (err) {
      // Fallback to models from config
      setAvailableModels(llmConfig?.models || [llmConfig?.model].filter(Boolean) || []);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleRefine = () => {
    const result: RefineResult = {
      style: selectedStyle,
      model: selectedModel,
      customPrompt: selectedStyle === "custom" ? customPrompt : undefined,
    };
    onRefine(result);
  };

  const getStyleDescription = () => {
    const option = styleOptions.find((o) => o.value === selectedStyle);
    return option?.description || "";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header Section */}
        <div className="px-6 pt-6 pb-4 border-b border-border flex-shrink-0">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {description}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-5">
            {/* Model Selection Card */}
            {llmConfig && (
              <Card className="border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    Model Selection
                  </CardTitle>
                  <CardDescription>
                    Choose which model to use for refinement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingModels ? (
                    <div className="flex items-center gap-2 py-2">
                      <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">
                        Loading models...
                      </span>
                    </div>
                  ) : (
                    <div className="relative">
                      <Button
                        variant="outline"
                        onClick={() => setShowModelMenu(!showModelMenu)}
                        disabled={isRefining || availableModels.length === 0}
                        className="w-full justify-between"
                      >
                        <span className="truncate">
                          {selectedModel || "Select model"}
                        </span>
                        <ChevronDown className="h-4 w-4 ml-2 shrink-0" />
                      </Button>
                      {showModelMenu && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-card rounded-lg shadow-lg border border-border z-10 max-h-48 overflow-y-auto">
                          <div className="p-2 border-b border-border">
                            <p className="text-xs text-muted-foreground">
                              {availableModels.length} models available
                            </p>
                          </div>
                          <div className="py-1">
                            {availableModels.map((model) => (
                              <button
                                key={model}
                                onClick={() => {
                                  setSelectedModel(model);
                                  setShowModelMenu(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-muted flex items-center justify-between ${
                                  model === selectedModel
                                    ? "bg-primary/10 text-primary"
                                    : "text-foreground"
                                }`}
                              >
                                <span className="truncate">{model}</span>
                                {model === selectedModel && (
                                  <Check className="h-4 w-4 text-primary shrink-0" />
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Style Selection Card */}
            <Card className="border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary" />
                  Refinement Style
                </CardTitle>
                <CardDescription>
                  Choose how the AI should rewrite your summary
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  {styleOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedStyle(option.value)}
                      disabled={isRefining}
                      className={`flex flex-col items-center justify-center px-3 py-3 rounded-lg border text-sm transition-all ${
                        selectedStyle === option.value
                          ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                          : "border-border hover:bg-muted hover:border-muted-foreground/30 text-foreground"
                      }`}
                    >
                      {option.value === "custom" && (
                        <Pencil className="h-4 w-4 mb-1" />
                      )}
                      <span className="font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>

                {/* Style Description */}
                <p className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-lg">
                  {getStyleDescription()}
                </p>

                {/* Custom Prompt Input */}
                {selectedStyle === "custom" && (
                  <div className="space-y-2 pt-2">
                    <Label className="text-sm font-medium">Custom Instructions</Label>
                    <Textarea
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      disabled={isRefining}
                      placeholder="Write your custom instructions for how the AI should refine the summary..."
                      className="min-h-[120px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground">
                      Describe how you want the AI to transform the text. Be specific about tone, style, and any changes you want.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Refining Progress */}
            {isRefining && (
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                    <div>
                      <p className="text-sm font-medium text-primary">
                        Refining summary...
                      </p>
                      <p className="text-xs text-primary/70">
                        Using {selectedModel} with {selectedStyle} style
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer with Actions */}
        <div className="px-6 py-4 border-t border-border bg-muted/30 flex items-center justify-between flex-shrink-0">
          <div className="text-sm text-muted-foreground">
            {llmConfig ? (
              <span className="flex items-center gap-1">
                <Bot className="h-3 w-3" />
                {selectedModel}
              </span>
            ) : (
              "No LLM config available"
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isRefining}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRefine}
              disabled={isRefining || !llmConfig || !selectedModel || (selectedStyle === "custom" && !customPrompt.trim())}
              className="min-w-[140px]"
            >
              {isRefining ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Refining...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Refine Summary
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default RefineDialog;