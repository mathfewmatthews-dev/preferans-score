export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

const blockedKey = /name|player|state|history|token|gameid|url|email/i;

export function sanitizeContext(context: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(context).map(([key, value]) => [key, blockedKey.test(key) ? "[redacted]" : value]));
}

export function createLogger(enabled = false): Logger {
  const write = (level: "debug" | "info" | "warn" | "error", message: string, context?: Record<string, unknown>) => {
    if (!enabled && (level === "debug" || level === "info")) return;
    console[level](`[preferans] ${message}`, sanitizeContext(context));
  };
  return {
    debug: (message, context) => write("debug", message, context),
    info: (message, context) => write("info", message, context),
    warn: (message, context) => write("warn", message, context),
    error: (message, context) => write("error", message, context),
  };
}
