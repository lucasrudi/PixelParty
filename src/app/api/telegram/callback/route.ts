import { NextResponse } from "next/server";
import {
  buildTelegramAuthRedirect,
  clearTelegramCookieOptions,
  createTelegramSessionCookie,
  createTelegramSessionFromIdToken,
  exchangeTelegramCode,
  getCookieValue,
  getTelegramOauthState,
  getTelegramSessionCookieOptions,
  TELEGRAM_AUTH_COOKIE_NAME,
  TELEGRAM_OAUTH_COOKIE_NAME,
} from "@/lib/telegram-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const oauthState = getTelegramOauthState(
    getCookieValue(request.headers.get("cookie"), TELEGRAM_OAUTH_COOKIE_NAME),
  );
  const fallbackReturnTo = oauthState?.returnTo ?? "/";

  const redirectTo = (error?: string) => {
    const response = NextResponse.redirect(
      new URL(buildTelegramAuthRedirect(fallbackReturnTo, error), url.origin),
    );

    response.cookies.set(
      TELEGRAM_OAUTH_COOKIE_NAME,
      "",
      clearTelegramCookieOptions(),
    );

    return response;
  };

  if (!oauthState) {
    return redirectTo("Telegram login expired. Please try again.");
  }

  if (url.searchParams.get("error")) {
    return redirectTo("Telegram login was cancelled.");
  }

  if (url.searchParams.get("state") !== oauthState.state) {
    return redirectTo("Telegram login could not be verified.");
  }

  const code = url.searchParams.get("code");

  if (!code) {
    return redirectTo("Telegram login did not return an authorization code.");
  }

  try {
    const callbackUrl = new URL("/api/telegram/callback", url.origin).toString();
    const tokens = await exchangeTelegramCode({
      callbackUrl,
      code,
      verifier: oauthState.verifier,
    });
    const session = await createTelegramSessionFromIdToken({
      expectedNonce: oauthState.nonce,
      idToken: tokens.id_token,
    });
    const response = NextResponse.redirect(
      new URL(buildTelegramAuthRedirect(oauthState.returnTo), url.origin),
    );

    response.cookies.set(
      TELEGRAM_AUTH_COOKIE_NAME,
      createTelegramSessionCookie(session),
      getTelegramSessionCookieOptions(),
    );
    response.cookies.set(
      TELEGRAM_OAUTH_COOKIE_NAME,
      "",
      clearTelegramCookieOptions(),
    );

    return response;
  } catch {
    return redirectTo("Telegram login failed. Please try again.");
  }
}
