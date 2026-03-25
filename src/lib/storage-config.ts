export type GameStorageDriver = "filesystem" | "postgres";
export type UploadStorageDriver = "filesystem" | "blob";

type Environment = Record<string, string | undefined>;

function normalizeDriver(value?: string) {
  return value?.trim().toLowerCase();
}

function parseBoolean(value?: string) {
  const normalized = value?.trim().toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return null;
}

export function getDatabaseUrl(env: Environment = process.env) {
  return env.POSTGRES_URL ?? env.DATABASE_URL ?? null;
}

export function isServerlessFilesystemDeployment(
  env: Environment = process.env,
) {
  return env.VERCEL === "1" || Boolean(env.LAMBDA_TASK_ROOT);
}

export function resolveGameStorageDriver(
  env: Environment = process.env,
): GameStorageDriver {
  const forcedDriver = normalizeDriver(env.PIXELPARTY_GAME_STORAGE);

  if (forcedDriver === "filesystem") {
    return "filesystem";
  }

  if (forcedDriver === "postgres") {
    return "postgres";
  }

  return getDatabaseUrl(env) ? "postgres" : "filesystem";
}

export function resolveUploadStorageDriver(
  env: Environment = process.env,
): UploadStorageDriver {
  const forcedDriver = normalizeDriver(env.PIXELPARTY_UPLOAD_STORAGE);

  if (forcedDriver === "filesystem") {
    return "filesystem";
  }

  if (forcedDriver === "blob") {
    return "blob";
  }

  return env.BLOB_READ_WRITE_TOKEN ? "blob" : "filesystem";
}

export function isSimulatorEnabled(env: Environment = process.env) {
  const explicitSetting =
    parseBoolean(env.PIXELPARTY_ENABLE_SIMULATOR) ??
    parseBoolean(env.NEXT_PUBLIC_ENABLE_SIMULATOR);

  if (explicitSetting !== null) {
    return explicitSetting;
  }

  return env.NODE_ENV !== "production";
}

export function assertSimulatorEnabled(env: Environment = process.env) {
  if (!isSimulatorEnabled(env)) {
    throw new Error("The local simulator is disabled in this deployment.");
  }
}

export function assertGameStorageAvailable(env: Environment = process.env) {
  if (
    resolveGameStorageDriver(env) === "filesystem" &&
    isServerlessFilesystemDeployment(env)
  ) {
    throw new Error(
      "External game storage is not configured for this deployment. Set POSTGRES_URL or DATABASE_URL, or run on a host with persistent writable disk.",
    );
  }
}

export function assertUploadStorageAvailable(env: Environment = process.env) {
  if (
    resolveUploadStorageDriver(env) === "filesystem" &&
    isServerlessFilesystemDeployment(env)
  ) {
    throw new Error(
      "External upload storage is not configured for this deployment. Set BLOB_READ_WRITE_TOKEN, or run on a host with persistent writable disk.",
    );
  }
}
