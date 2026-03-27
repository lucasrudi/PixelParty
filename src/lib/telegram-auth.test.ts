import { describe, expect, it } from "vitest";
import {
  buildTelegramAuthRedirect,
  clearTelegramCookieOptions,
  createTelegramOauthCookie,
  createTelegramOauthState,
  createTelegramSessionCookie,
  getTelegramOauthCookieOptions,
  getTelegramHandleFromSession,
  getTelegramSessionCookieOptions,
  getTelegramOauthState,
  getTelegramSession,
  isTelegramLoginEnabled,
} from "@/lib/telegram-auth";

const ENV = {
  PIXELPARTY_TELEGRAM_LOGIN_CLIENT_ID: "123456789",
  PIXELPARTY_TELEGRAM_LOGIN_CLIENT_SECRET: "secret-value",
};

describe("telegram auth helpers", () => {
  it("round-trips the signed Telegram session cookie", () => {
    const encoded = createTelegramSessionCookie(
      {
        authDate: 1_700_000_000,
        id: "123456789",
        name: "Fede",
        username: "fede",
        verifiedAt: "2026-03-27T10:00:00.000Z",
      },
      ENV,
    );

    expect(getTelegramSession(encoded, ENV)).toEqual({
      authDate: 1_700_000_000,
      id: "123456789",
      name: "Fede",
      username: "fede",
      verifiedAt: "2026-03-27T10:00:00.000Z",
    });
    expect(getTelegramHandleFromSession(getTelegramSession(encoded, ENV))).toBe(
      "@fede",
    );
  });

  it("round-trips the temporary oauth state cookie", () => {
    const state = createTelegramOauthState("/join/ABC123");
    const encoded = createTelegramOauthCookie(state, ENV);

    expect(getTelegramOauthState(encoded, ENV)).toMatchObject({
      nonce: state.nonce,
      returnTo: "/join/ABC123",
      state: state.state,
      verifier: state.verifier,
    });
  });

  it("only enables Telegram login when both credentials are present", () => {
    expect(isTelegramLoginEnabled(ENV)).toBe(true);
    expect(
      isTelegramLoginEnabled({
        PIXELPARTY_TELEGRAM_LOGIN_CLIENT_ID: "123456789",
      }),
    ).toBe(false);
  });

  it("sanitizes auth redirect targets to local paths", () => {
    expect(buildTelegramAuthRedirect("https://evil.example")).toBe("/");
    expect(buildTelegramAuthRedirect("/join/ABC123", "Try again")).toBe(
      "/join/ABC123?telegramAuthError=Try+again",
    );
  });

  it("uses secure cookies by default, even outside production", () => {
    expect(getTelegramSessionCookieOptions({ NODE_ENV: "development" }).secure).toBe(
      true,
    );
    expect(getTelegramOauthCookieOptions({ NODE_ENV: "test" }).secure).toBe(true);
    expect(clearTelegramCookieOptions({ NODE_ENV: "development" }).secure).toBe(
      true,
    );
  });

  it("allows insecure cookies only when explicitly requested", () => {
    const env = {
      ...ENV,
      INSECURE_COOKIES: "true",
      NODE_ENV: "development",
    };

    expect(getTelegramSessionCookieOptions(env).secure).toBe(false);
    expect(getTelegramOauthCookieOptions(env).secure).toBe(false);
    expect(clearTelegramCookieOptions(env).secure).toBe(false);
  });
});
