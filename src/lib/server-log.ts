import pino from "pino";

type LogMetadata = Record<string, unknown> | undefined;

const logger = pino({
  base: undefined,
  level:
    process.env.LOG_LEVEL ??
    (process.env.NODE_ENV === "development" ? "debug" : "info"),
  timestamp: pino.stdTimeFunctions.isoTime,
});

function getErrorDetails(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }

  return {
    message: String(error),
  };
}

function logServerEvent(
  level: "warn" | "error",
  context: string,
  error: unknown,
  metadata?: LogMetadata,
) {
  logger[level](
    {
      context,
      ...getErrorDetails(error),
      ...(metadata ?? {}),
    },
    context,
  );
}

export function logServerWarning(
  context: string,
  error: unknown,
  metadata?: LogMetadata,
) {
  logServerEvent("warn", context, error, metadata);
}

export function logServerError(
  context: string,
  error: unknown,
  metadata?: LogMetadata,
) {
  logServerEvent("error", context, error, metadata);
}
