import { NextResponse } from "next/server";
import {
  assertTelegramLoginConfigured,
  buildTelegramLoginUrl,
  createTelegramOauthCookie,
  createTelegramOauthState,
  getTelegramOauthCookieOptions,
  TELEGRAM_OAUTH_COOKIE_NAME,
} from "@/lib/telegram-auth";
import { jsonError } from "@/lib/route-response";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    assertTelegramLoginConfigured();

    const url = new URL(request.url);
    const state = createTelegramOauthState(url.searchParams.get("returnTo"));
    const callbackUrl = new URL("/api/telegram/callback", url.origin).toString();
    const redirect = NextResponse.redirect(
      buildTelegramLoginUrl({
        callbackUrl,
        state,
      }),
    );

    redirect.cookies.set(
      TELEGRAM_OAUTH_COOKIE_NAME,
      createTelegramOauthCookie(state),
      getTelegramOauthCookieOptions(),
    );

    return redirect;
  } catch (error) {
    return jsonError(error, 503);
  }
}
