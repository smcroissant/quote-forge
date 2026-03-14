// ── Structured Logger ───────────────────────────────
// Replaces console.log/error with structured JSON logging

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

function formatLog(entry: LogEntry): string {
  if (process.env.NODE_ENV === "development") {
    const emoji = { debug: "🔍", info: "ℹ️", warn: "⚠️", error: "❌" };
    const prefix = `${emoji[entry.level]} [${entry.level.toUpperCase()}]`;
    const context = entry.context ? ` ${JSON.stringify(entry.context)}` : "";
    const error = entry.error ? `\n${entry.error.stack}` : "";
    return `${prefix} ${entry.message}${context}${error}`;
  }
  return JSON.stringify(entry);
}

function log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    context,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  };

  const output = formatLog(entry);

  switch (level) {
    case "error":
      console.error(output);
      break;
    case "warn":
      console.warn(output);
      break;
    default:
      console.log(output);
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    log("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    log("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    log("warn", message, context),
  error: (message: string, error?: Error, context?: Record<string, unknown>) =>
    log("error", message, context, error),
};
