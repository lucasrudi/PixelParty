import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MAX_EVIDENCE_REQUEST_SIZE_BYTES,
  MAX_EVIDENCE_UPLOAD_SIZE_BYTES,
} from "@/lib/types";
import { parseEvidenceRequest } from "@/lib/evidence-request";

const updateGameMock = vi.fn();
const deliverTelegramReadyMessagesMock = vi.fn();
const saveBrowserFileMock = vi.fn();
const assertSimulatorEnabledMock = vi.fn();
const logServerErrorMock = vi.fn();
const logServerWarningMock = vi.fn();

vi.mock("@/lib/store", () => ({
  updateGame: updateGameMock,
}));

vi.mock("@/lib/telegram-delivery", () => ({
  deliverTelegramReadyMessages: deliverTelegramReadyMessagesMock,
}));

vi.mock("@/lib/uploads", () => ({
  saveBrowserFile: saveBrowserFileMock,
}));

vi.mock("@/lib/storage-config", () => ({
  assertSimulatorEnabled: assertSimulatorEnabledMock,
}));

vi.mock("@/lib/server-log", () => ({
  logServerError: logServerErrorMock,
  logServerWarning: logServerWarningMock,
}));

describe("evidence route validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("rejects unsupported evidence kinds before updating the game", async () => {
    const route = await import("@/app/api/games/[gameId]/quests/[questId]/evidence/route");
    const formData = new FormData();
    formData.set("playerId", "player_1");
    formData.set("description", "Definitely a quest proof");
    formData.set("kind", "audio");
    formData.set("proofUrl", "https://example.com/proof.mp3");

    const response = await route.POST(
      new Request("http://localhost/api/games/game_1/quests/quest_1/evidence", {
        method: "POST",
        body: formData,
      }),
      {
        params: Promise.resolve({
          gameId: "game_1",
          questId: "quest_1",
        }),
      },
    );
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Evidence type must be one of: photo, video.");
    expect(updateGameMock).not.toHaveBeenCalled();
    expect(saveBrowserFileMock).not.toHaveBeenCalled();
    expect(deliverTelegramReadyMessagesMock).not.toHaveBeenCalled();
  });

  it("rejects oversized evidence descriptions before saving uploads", async () => {
    const route = await import("@/app/api/games/[gameId]/quests/[questId]/evidence/route");
    const formData = new FormData();
    formData.set("playerId", "player_1");
    formData.set("description", "x".repeat(501));
    formData.set("kind", "photo");
    formData.set("proofUrl", "https://example.com/proof.jpg");

    const response = await route.POST(
      new Request("http://localhost/api/games/game_1/quests/quest_1/evidence", {
        method: "POST",
        body: formData,
      }),
      {
        params: Promise.resolve({
          gameId: "game_1",
          questId: "quest_1",
        }),
      },
    );
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe(
      "Evidence descriptions must be 500 characters or fewer.",
    );
    expect(updateGameMock).not.toHaveBeenCalled();
    expect(saveBrowserFileMock).not.toHaveBeenCalled();
    expect(deliverTelegramReadyMessagesMock).not.toHaveBeenCalled();
  });

  it("rejects oversized evidence requests before parsing form data", async () => {
    const route = await import("@/app/api/games/[gameId]/quests/[questId]/evidence/route");

    const response = await route.POST(
      new Request("http://localhost/api/games/game_1/quests/quest_1/evidence", {
        method: "POST",
        headers: {
          "Content-Length": String(MAX_EVIDENCE_REQUEST_SIZE_BYTES + 1),
          "Content-Type": "multipart/form-data; boundary=codex",
        },
        body: "--codex--",
      }),
      {
        params: Promise.resolve({
          gameId: "game_1",
          questId: "quest_1",
        }),
      },
    );
    const payload = (await response.json()) as { error?: string };

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Evidence requests must be 10 MB or smaller.");
    expect(updateGameMock).not.toHaveBeenCalled();
    expect(saveBrowserFileMock).not.toHaveBeenCalled();
    expect(deliverTelegramReadyMessagesMock).not.toHaveBeenCalled();
  });

  it("rejects oversized uploads before saving browser files", async () => {
    const oversizedFile = new File(["x"], "proof.jpg", {
      type: "image/jpeg",
    });
    const formData = new FormData();

    Object.defineProperty(oversizedFile, "size", {
      value: MAX_EVIDENCE_UPLOAD_SIZE_BYTES + 1,
    });

    formData.set("playerId", "player_1");
    formData.set("description", "Definitely a quest proof");
    formData.set("kind", "photo");
    formData.set("file", oversizedFile);

    expect(() => parseEvidenceRequest(formData)).toThrow(
      "Evidence uploads must be 8 MB or smaller.",
    );
    expect(updateGameMock).not.toHaveBeenCalled();
    expect(saveBrowserFileMock).not.toHaveBeenCalled();
    expect(deliverTelegramReadyMessagesMock).not.toHaveBeenCalled();
  });
});
