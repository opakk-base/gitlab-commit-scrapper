import { isDebugMode } from "../services/settings";
import { GitLabError } from "../services/gitlab";

interface ErrorDisplayProps {
  error: GitLabError;
}

export default function ErrorDisplay({ error }: ErrorDisplayProps) {
  const debugMode = isDebugMode();

  const getErrorCodeIcon = (code: string) => {
    switch (code) {
      case "NETWORK_ERROR":
        return "🌐";
      case "UNAUTHORIZED":
        return "🔐";
      case "FORBIDDEN":
        return "🚫";
      case "NOT_FOUND":
        return "🔍";
      case "RATE_LIMITED":
        return "⏱️";
      case "SERVER_ERROR":
        return "⚠️";
      case "SERVICE_UNAVAILABLE":
        return "🔧";
      case "VALIDATION_ERROR":
        return "✏️";
      default:
        return "❌";
    }
  };

  return (
    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getErrorCodeIcon(error.code)}</span>
        <div className="flex-1">
          {/* Always show error code in debug mode */}
          {debugMode && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono bg-destructive/20 px-2 py-0.5 rounded text-destructive">
                {error.code}
              </span>
            </div>
          )}

          <p className="font-medium text-destructive">{error.message}</p>

          {/* Show suggestion in normal mode */}
          {!debugMode && (
            <p className="text-sm text-destructive/80 mt-2">💡 {error.suggestion}</p>
          )}

          {/* Debug mode: always show details expanded */}
          {debugMode && error.details && (
            <div className="mt-2">
              <p className="text-sm font-medium text-destructive/80 mb-1">
                Technical Details:
              </p>
              <pre className="p-2 bg-muted rounded text-xs text-muted-foreground overflow-auto whitespace-pre-wrap">
                {error.details}
              </pre>
            </div>
          )}

          {/* Debug mode: show full error object */}
          {debugMode && (
            <details className="mt-2" open>
              <summary className="text-sm text-destructive cursor-pointer hover:underline font-medium">
                Full Error Object
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground overflow-auto">
                {JSON.stringify(error, null, 2)}
              </pre>
            </details>
          )}

          {/* Normal mode: collapsible details */}
          {!debugMode && error.details && (
            <details className="mt-2">
              <summary className="text-sm text-destructive cursor-pointer hover:underline">
                View technical details
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground overflow-auto">
                {error.details}
              </pre>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}