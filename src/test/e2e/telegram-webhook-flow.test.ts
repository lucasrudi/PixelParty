import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, joinGame, startGame } from "@/lib/game-engine";

describe.sequential("telegram webhook flow", () => {
  const originalEnv = { ...process.env };
  const originalCwd = process.cwd();
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "pixelparty-telegram-"));
    process.chdir(tempDir);
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      PIXELPARTY_GAME_STORAGE: "filesystem",
      PIXELPARTY_UPLOAD_STORAGE: "filesystem",
      PIXELPARTY_ENABLE_SIMULATOR: "true",
      TELEGRAM_BOT_TOKEN: "123456:test-token",
      TELEGRAM_BOT_USERNAME: "pixelparty_bot",
      NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: "pixelparty_bot",
      TELEGRAM_BINDING_ENCRYPTION_KEY: "pixelparty-secret-key",
      TELEGRAM_WEBHOOK_SECRET_TOKEN: "hook-secret",
      APP_URL: "https://pixelparty.example.com",
    };
    vi.resetModules();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    vi.resetModules();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("sends today quest when /today command is received from a linked player", async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(JSON.stringify({ ok: true, result: { message_id: 1 } })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { saveGame } = await import("@/lib/store");
    const webhookRoute = await import("@/app/api/telegram/webhook/route");

    const game = createGame({
      title: "Production Bash",
      groomName: "Tincho",
      hostName: "Fede",
      telegramUserId: "111111",
      startDate: "2026-03-27",
      endDate: "2026-03-29",
      accessMode: "telegram",
    });

    joinGame(game, { name: "Mauri", telegramUserId: "998877", telegramChatId: "998877" });
    joinGame(game, { name: "Seba", telegramUserId: "123456", telegramChatId: "123456" });
    startGame(game);
    await saveGame(game);

    const response = await webhookRoute.POST(
      new Request("http://localhost/api/telegram/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-bot-api-secret-token": "hook-secret",
        },
        body: JSON.stringify({
          update_id: 1,
          message: {
            message_id: 1,
            text: "/today",
            chat: { id: 998877, type: "private" },
            from: { id: 998877, is_bot: false, first_name: "Mauri" },
          },
        }),
      }),
    );

    expect(response.ok).toBe(true);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(1);

    const [firstUrl] = fetchMock.mock.calls[0] ?? [];
    expect(String(firstUrl)).toContain("/sendMessage");
  });

  it("rejects webhook requests with the wrong secret", async () => {
    const webhookRoute = await import("@/app/api/telegram/webhook/route");

    const response = await webhookRoute.POST(
      new Request("http://localhost/api/telegram/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-telegram-bot-api-secret-token": "wrong-secret",
        },
        body: JSON.stringify({
          update_id: 1,
        }),
      }),
    );

    expect(response.status).toBe(401);
  });
});
