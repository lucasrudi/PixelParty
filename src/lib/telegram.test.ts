import { describe, expect, it } from "vitest";
import {
  getTelegramBotToken,
  getTelegramBotUrl,
  getTelegramBotUsername,
  isTelegramBotConfigured,
} from "@/lib/telegram";

describe("telegram configuration", () => {
  it("reads the server token from TELEGRAM_BOT_TOKEN", () => {
    expect(
      getTelegramBotToken({
        TELEGRAM_BOT_TOKEN: "123456:abc",
      }),
    ).toBe("123456:abc");
  });

  it("normalizes the bot username from server or public env", () => {
    expect(
      getTelegramBotUsername({
        TELEGRAM_BOT_USERNAME: "@pixel_party_bot",
      }),
    ).toBe("pixel_party_bot");

    expect(
      getTelegramBotUsername({
        NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: "pixel_party_bot",
      }),
    ).toBe("pixel_party_bot");
  });

  it("builds the public bot URL when a username is configured", () => {
    expect(
      getTelegramBotUrl({
        NEXT_PUBLIC_TELEGRAM_BOT_USERNAME: "@pixel_party_bot",
      }),
    ).toBe("https://t.me/pixel_party_bot");
  });

  it("reports whether the server token is configured", () => {
    expect(isTelegramBotConfigured({})).toBe(false);
    expect(
      isTelegramBotConfigured({
        TELEGRAM_BOT_TOKEN: "123456:abc",
      }),
    ).toBe(true);
  });
});
