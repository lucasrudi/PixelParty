import { mkdtemp, readFile, rm } from "fs/promises";
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

  it("binds a Telegram chat, stores identifiers encrypted, and delivers pending messages", async () => {
    const fetchMock = vi.fn().mockImplementation(
      async () =>
        new Response(JSON.stringify({ ok: true, result: { message_id: 1 } })),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { saveGame, getGame } = await import("@/lib/store");
    const { getTelegramBindingByPlayerId } = await import("@/lib/telegram-bindings");
    const webhookRoute = await import("@/app/api/telegram/webhook/route");

    const game = createGame({
      title: "Production Bash",
      groomName: "Tincho",
      hostName: "Fede",
      telegramHandle: "@fede",
      startDate: "2026-03-27",
      endDate: "2026-03-29",
      accessMode: "telegram",
    });

    joinGame(game, { name: "Mauri", telegramHandle: "@mauri" });
    joinGame(game, { name: "Seba", telegramHandle: "@seba" });
    startGame(game);
    await saveGame(game);

    const mauri = game.players.find((player) => player.name === "Mauri");
    expect(mauri?.telegramBindingToken).toBeTruthy();

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
            text: `/start bind_${mauri?.telegramBindingToken}`,
            chat: {
              id: 998877,
              type: "private",
            },
            from: {
              id: 123456,
              is_bot: false,
              first_name: "Mauri",
              username: "mauri",
            },
          },
        }),
      }),
    );

    expect(response.ok).toBe(true);

    const binding = await getTelegramBindingByPlayerId(mauri!.id);
    expect(binding?.playerId).toBe(mauri!.id);
    expect(binding?.chatId).toBe("998877");
    expect(binding?.telegramUserId).toBe("123456");
    expect(binding?.telegramUsername).toBe("mauri");

    const bindingStore = await readFile(
      path.join(tempDir, ".data", "telegram-bindings.json"),
      "utf8",
    );

    expect(bindingStore).not.toContain("998877");
    expect(bindingStore).not.toContain("123456");
    expect(bindingStore).not.toContain("mauri");

    const updatedGame = await getGame(game.id);
    const deliveredMessages = updatedGame?.messages.filter((message) =>
      message.telegramDeliveredTo?.includes(mauri!.id),
    );

    expect(deliveredMessages && deliveredMessages.length > 0).toBe(true);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);

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
