import { NextResponse } from "next/server";
import { jsonError } from "@/lib/route-response";
import {
  fetchTelegramBotProfile,
  getTelegramBotUrl,
  getTelegramBotUsername,
  isTelegramBotConfigured,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const configured = isTelegramBotConfigured();
    const username = getTelegramBotUsername();
    const botUrl = getTelegramBotUrl();

    if (!configured) {
      return NextResponse.json({
        configured: false,
        username,
        botUrl,
      });
    }

    const profile = await fetchTelegramBotProfile();

    return NextResponse.json({
      configured: true,
      username: profile.username ?? username,
      botUrl:
        profile.username ? `https://t.me/${profile.username}` : botUrl,
      profile,
    });
  } catch (error) {
    return jsonError(error, 502);
  }
}
