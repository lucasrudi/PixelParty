import { NextResponse } from "next/server";
import { joinGame } from "@/lib/game-engine";
import { jsonError } from "@/lib/route-response";
import { logServerWarning } from "@/lib/server-log";
import { assertSimulatorEnabled } from "@/lib/storage-config";
import { updateGame } from "@/lib/store";
import {
  getCookieValue,
  getTelegramHandleFromSession,
  getTelegramSession,
  TELEGRAM_AUTH_COOKIE_NAME,
} from "@/lib/telegram-auth";
import { notifyPlayerOfLobbyLink } from "@/lib/telegram";
import type { JoinGameInput } from "@/lib/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await context.params;
    const body = (await request.json()) as JoinGameInput;
    const telegramSession = getTelegramSession(
      getCookieValue(request.headers.get("cookie"), TELEGRAM_AUTH_COOKIE_NAME),
    );
    const effectiveBody: JoinGameInput = {
      ...body,
      telegramHandle:
        body.telegramHandle?.trim() || getTelegramHandleFromSession(telegramSession),
      telegramUserId: telegramSession?.id ?? body.telegramUserId,
      telegramVerifiedAt: telegramSession?.verifiedAt ?? body.telegramVerifiedAt,
      telegramChatId: body.telegramChatId ?? telegramSession?.id ?? body.telegramUserId,
    };
    let joinedPlayerId = "";

    const game = await updateGame(gameId, (current) => {
      if (current.accessMode === "simulator") {
        assertSimulatorEnabled();
      }

      const result = joinGame(current, effectiveBody);
      joinedPlayerId = result.player.id;
      return result.game;
    });
    const joinedPlayer = game.players.find((player) => player.id === joinedPlayerId);

    if (game.accessMode === "telegram" && joinedPlayer) {
      await notifyPlayerOfLobbyLink(game, joinedPlayer, "joined").catch((error) =>
        logServerWarning("telegram.lobby-link", error, {
          event: "joined",
          gameId: game.id,
          playerId: joinedPlayer.id,
        }),
      );
    }

    return NextResponse.json({
      gameId: game.id,
      playerId: joinedPlayerId,
    });
  } catch (error) {
    return jsonError(error);
  }
}
