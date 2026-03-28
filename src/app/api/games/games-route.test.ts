import { afterEach, describe, expect, it, vi } from "vitest";

describe("games route telegram logging", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("logs and still creates the game when the first Telegram DM fails", async () => {
    process.env = {
      ...originalEnv,
      TELEGRAM_BOT_TOKEN: "123456:test-token",
      TELEGRAM_BOT_USERNAME: "pixelparty_bot",
      APP_URL: "https://pixelparty.example.com",
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: false,
            description: "Forbidden: bot can't initiate conversation with a user",
          }),
          {
            status: 403,
            headers: {
              "Content-Type": "application/json",
            },
          },
        ),
      );
    const logWrites: string[] = [];
    const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(
      ((chunk, encoding, callback) => {
        logWrites.push(typeof chunk === "string" ? chunk : chunk.toString());

        if (typeof encoding === "function") {
          encoding();
        } else {
          callback?.();
        }

        return true;
      }) as typeof process.stdout.write,
    );

    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const route = await import("@/app/api/games/route");
    const response = await route.POST(
      new Request("http://localhost/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Weekend of Bad Decisions",
          groomName: "Tincho",
          startDate: "2026-03-27",
          endDate: "2026-03-29",
          hostName: "Fede",
          telegramHandle: "@fede",
          telegramChatId: "123456",
          accessMode: "telegram",
        }),
      }),
    );
    const payload = (await response.json()) as {
      gameId?: string;
      hostPlayerId?: string;
    };

    expect(response.status).toBe(200);
    expect(payload.gameId).toBeTruthy();
    expect(payload.hostPlayerId).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(stdoutSpy).toHaveBeenCalled();
    expect(logWrites.join("")).toContain('"context":"telegram.lobby-link"');
    expect(logWrites.join("")).toContain('"event":"created"');
    expect(logWrites.join("")).toContain(`"gameId":"${payload.gameId}"`);
    expect(logWrites.join("")).toContain(
      "\"message\":\"Telegram API sendMessage failed with status 403",
    );
  });
});
