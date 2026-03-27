import { NextResponse } from "next/server";
import {
  buildTelegramAuthRedirect,
  clearTelegramCookieOptions,
  TELEGRAM_AUTH_COOKIE_NAME,
  TELEGRAM_OAUTH_COOKIE_NAME,
} from "@/lib/telegram-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = NextResponse.redirect(
    new URL(
      buildTelegramAuthRedirect(url.searchParams.get("returnTo") ?? "/"),
      url.origin,
    ),
  );

  response.cookies.set(
    TELEGRAM_AUTH_COOKIE_NAME,
    "",
    clearTelegramCookieOptions(),
  );
  response.cookies.set(
    TELEGRAM_OAUTH_COOKIE_NAME,
    "",
    clearTelegramCookieOptions(),
  );

  return response;
}
