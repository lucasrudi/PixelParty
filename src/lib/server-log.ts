type LogMetadata = Record<string, unknown> | undefined;

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

export function logServerWarning(
  context: string,
  error: unknown,
  metadata?: LogMetadata,
) {
  console.warn(`[${context}]`, {
    ...getErrorDetails(error),
    ...(metadata ?? {}),
  });
}

export function logServerError(
  context: string,
  error: unknown,
  metadata?: LogMetadata,
) {
  console.error(`[${context}]`, {
    ...getErrorDetails(error),
    ...(metadata ?? {}),
  });
}
