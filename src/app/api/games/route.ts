import { NextResponse } from "next/server";
import { createGame } from "@/lib/game-engine";
import { jsonError } from "@/lib/route-response";
import { logServerWarning } from "@/lib/server-log";
import { assertSimulatorEnabled } from "@/lib/storage-config";
import { listGamesForTelegramUserId, saveGame } from "@/lib/store";
import {
  getCookieValue,
  getTelegramHandleFromSession,
  getTelegramSession,
  TELEGRAM_AUTH_COOKIE_NAME,
} from "@/lib/telegram-auth";
import { notifyPlayerOfLobbyLink } from "@/lib/telegram";
import type { CreateGameInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramUserId = (searchParams.get("telegramUserId") ?? "").trim();

    if (!telegramUserId) {
      return NextResponse.json(
        { error: "A Telegram User ID is required." },
        { status: 400 },
      );
    }

    const games = await listGamesForTelegramUserId(telegramUserId);

    return NextResponse.json({
      games: games.map(({ game, player }) => ({
        accessMode: game.accessMode,
        currentDay: game.currentDay,
        endDate: game.endDate,
        gameId: game.id,
        hostName:
          game.players.find((entry) => entry.id === game.hostPlayerId)?.name ??
          "Host",
        joinedAt: player.joinedAt,
        playerId: player.id,
        playerName: player.name,
        startDate: game.startDate,
        status: game.status,
        title: game.title,
        totalDays: game.totalDays,
        updatedAt: game.updatedAt,
      })),
    });
  } catch (error) {
    return jsonError(error);
  }
}

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
      telegramChatId: body.telegramChatId ?? telegramSession?.id ?? body.telegramUserId,
    };

    if (effectiveBody.accessMode === "simulator") {
      assertSimulatorEnabled();
    }

    const game = createGame(effectiveBody);
    await saveGame(game);
    const host = game.players.find((player) => player.id === game.hostPlayerId);

    if (game.accessMode === "telegram" && host) {
      await notifyPlayerOfLobbyLink(game, host, "created").catch((error) =>
        logServerWarning("telegram.lobby-link", error, {
          event: "created",
          gameId: game.id,
          playerId: host.id,
        }),
      );
    }

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
