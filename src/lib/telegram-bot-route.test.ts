import { afterEach, describe, expect, it, vi } from "vitest";

describe("telegram bot route", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns an unconfigured response when no bot token is available", async () => {
    process.env = {
      ...originalEnv,
      TELEGRAM_BOT_TOKEN: "",
      TELEGRAM_BOT_USERNAME: "pixelparty_bot",
      NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: "pixelparty_bot",
    };
    vi.resetModules();

    const route = await import("@/app/api/telegram/bot/route");
    const response = await route.GET();
    const payload = (await response.json()) as {
      configured: boolean;
      username: string | null;
      botUrl: string | null;
    };

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      configured: false,
      username: "pixelparty_bot",
      botUrl: "https://t.me/pixelparty_bot",
    });
  });

  it("returns the Telegram bot profile when the bot is configured", async () => {
    process.env = {
      ...originalEnv,
      TELEGRAM_BOT_TOKEN: "123456:test-token",
      TELEGRAM_BOT_USERNAME: "pixelparty_bot",
    };

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: {
              id: 123456,
              is_bot: true,
              first_name: "Pixel Party",
              username: "pixelparty_live_bot",
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            ok: true,
            result: {
              url: "https://pixelparty.example.com/api/telegram/webhook",
              pending_update_count: 0,
            },
          }),
        ),
      );

    vi.stubGlobal("fetch", fetchMock);
    vi.resetModules();

    const route = await import("@/app/api/telegram/bot/route");
    const response = await route.GET();
    const payload = (await response.json()) as {
      configured: boolean;
      username: string | null;
      botUrl: string | null;
      profile?: {
        id: number;
        username?: string;
      };
      webhook?: {
        url?: string;
        pending_update_count?: number;
      };
    };

    expect(response.status).toBe(200);
    expect(payload.configured).toBe(true);
    expect(payload.username).toBe("pixelparty_live_bot");
    expect(payload.botUrl).toBe("https://t.me/pixelparty_live_bot");
    expect(payload.profile?.id).toBe(123456);
    expect(payload.webhook).toEqual({
      url: "https://pixelparty.example.com/api/telegram/webhook",
      pending_update_count: 0,
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://api.telegram.org/bot123456:test-token/getMe",
      {
        cache: "no-store",
      },
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "https://api.telegram.org/bot123456:test-token/getWebhookInfo",
      {
        cache: "no-store",
      },
    );
  });
});
