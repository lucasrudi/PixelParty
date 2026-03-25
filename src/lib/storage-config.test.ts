import { describe, expect, it } from "vitest";
import {
  assertGameStorageAvailable,
  assertSimulatorEnabled,
  assertUploadStorageAvailable,
  getDatabaseUrl,
  isSimulatorEnabled,
  resolveGameStorageDriver,
  resolveUploadStorageDriver,
} from "@/lib/storage-config";

describe("storage configuration", () => {
  it("falls back to the filesystem when no external storage is configured", () => {
    expect(resolveGameStorageDriver({})).toBe("filesystem");
    expect(resolveUploadStorageDriver({})).toBe("filesystem");
  });

  it("auto-enables Postgres when a database URL is present", () => {
    expect(
      resolveGameStorageDriver({
        POSTGRES_URL: "postgres://pixelparty.test/game",
      }),
    ).toBe("postgres");
  });

  it("auto-enables Blob when a blob token is present", () => {
    expect(
      resolveUploadStorageDriver({
        BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test",
      }),
    ).toBe("blob");
  });

  it("lets local development force filesystem storage even when hosted env vars exist", () => {
    expect(
      resolveGameStorageDriver({
        POSTGRES_URL: "postgres://pixelparty.test/game",
        PIXELPARTY_GAME_STORAGE: "filesystem",
      }),
    ).toBe("filesystem");

    expect(
      resolveUploadStorageDriver({
        BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test",
        PIXELPARTY_UPLOAD_STORAGE: "filesystem",
      }),
    ).toBe("filesystem");
  });

  it("prefers an explicit database URL over an empty fallback", () => {
    expect(
      getDatabaseUrl({
        DATABASE_URL: "postgres://pixelparty.test/game",
      }),
    ).toBe("postgres://pixelparty.test/game");
  });

  it("disables the simulator by default in production", () => {
    expect(isSimulatorEnabled({ NODE_ENV: "production" })).toBe(false);
    expect(isSimulatorEnabled({ NODE_ENV: "development" })).toBe(true);
  });

  it("lets deployments opt back into the simulator explicitly", () => {
    expect(
      isSimulatorEnabled({
        NODE_ENV: "production",
        PIXELPARTY_ENABLE_SIMULATOR: "true",
      }),
    ).toBe(true);
  });

  it("throws a clear error when serverless production falls back to local game storage", () => {
    expect(() =>
      assertGameStorageAvailable({
        NODE_ENV: "production",
        VERCEL: "1",
      }),
    ).toThrow("External game storage is not configured");
  });

  it("throws a clear error when serverless production falls back to local upload storage", () => {
    expect(() =>
      assertUploadStorageAvailable({
        NODE_ENV: "production",
        VERCEL: "1",
      }),
    ).toThrow("External upload storage is not configured");
  });

  it("throws a clear error when the simulator is disabled", () => {
    expect(() =>
      assertSimulatorEnabled({
        NODE_ENV: "production",
      }),
    ).toThrow("The local simulator is disabled");
  });
});
