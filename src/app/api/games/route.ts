import { NextResponse } from "next/server";
import { createGame, normalizeTelegramHandle } from "@/lib/game-engine";
import { jsonError } from "@/lib/route-response";
import { assertSimulatorEnabled } from "@/lib/storage-config";
import { listGamesForTelegramHandle, saveGame } from "@/lib/store";
import { notifyPlayerOfLobbyLink } from "@/lib/telegram";
import { CreateGameInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramHandle = normalizeTelegramHandle(
      searchParams.get("telegramHandle") ?? "",
    );

    if (!telegramHandle) {
      return NextResponse.json(
        { error: "A Telegram handle is required." },
        { status: 400 },
      );
    }

    const games = await listGamesForTelegramHandle(telegramHandle);

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

    if (body.accessMode === "simulator") {
      assertSimulatorEnabled();
    }

    const game = createGame(body);
    await saveGame(game);
    const host = game.players.find((player) => player.id === game.hostPlayerId);

    if (game.accessMode === "telegram" && host) {
      await notifyPlayerOfLobbyLink(game, host, "created").catch(() => undefined);
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
