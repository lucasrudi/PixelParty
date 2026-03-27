import { NextResponse } from "next/server";
import { createGame } from "@/lib/game-engine";
import { jsonError } from "@/lib/route-response";
import { assertSimulatorEnabled } from "@/lib/storage-config";
import { saveGame } from "@/lib/store";
import {
  getCookieValue,
  getTelegramHandleFromSession,
  getTelegramSession,
  TELEGRAM_AUTH_COOKIE_NAME,
} from "@/lib/telegram-auth";
import { CreateGameInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateGameInput;
    const telegramSession = getTelegramSession(
      getCookieValue(request.headers.get("cookie"), TELEGRAM_AUTH_COOKIE_NAME),
    );
    const effectiveBody: CreateGameInput = {
      ...body,
      telegramHandle:
        body.telegramHandle?.trim() || getTelegramHandleFromSession(telegramSession),
      telegramUserId: telegramSession?.id ?? body.telegramUserId,
      telegramVerifiedAt: telegramSession?.verifiedAt ?? body.telegramVerifiedAt,
    };

    if (effectiveBody.accessMode === "simulator") {
      assertSimulatorEnabled();
    }

    const game = createGame(effectiveBody);
    await saveGame(game);

    return NextResponse.json({
      gameId: game.id,
      inviteCode: game.inviteCode,
      hostPlayerId: game.hostPlayerId,
      accessMode: game.accessMode,
    });
  } catch (error) {
    return jsonError(error);
  }
}
