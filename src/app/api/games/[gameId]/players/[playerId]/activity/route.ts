import { NextResponse } from "next/server";
import { submitActivity } from "@/lib/game-engine";
import { UserFacingError } from "@/lib/errors";
import { jsonError } from "@/lib/route-response";
import { assertSimulatorEnabled } from "@/lib/storage-config";
import { updateGame } from "@/lib/store";
import { deliverTelegramReadyMessages } from "@/lib/telegram-delivery";
import {
  getCookieValue,
  getTelegramSession,
  TELEGRAM_AUTH_COOKIE_NAME,
} from "@/lib/telegram-auth";
import { SubmitActivityInput } from "@/lib/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ gameId: string; playerId: string }> },
) {
  try {
    const { gameId, playerId } = await context.params;
    const body = (await request.json()) as SubmitActivityInput;
    const telegramSession = getTelegramSession(
      getCookieValue(request.headers.get("cookie"), TELEGRAM_AUTH_COOKIE_NAME),
    );

    const game = await updateGame(gameId, (current) => {
      if (current.accessMode === "simulator") {
        assertSimulatorEnabled();
        return submitActivity(current, playerId, body);
      }

      const sessionPlayer = current.players.find(
        (p) => p.telegramUserId === telegramSession?.id,
      );
      if (!sessionPlayer || sessionPlayer.id !== playerId) {
        throw new UserFacingError("Authentication required to submit activity.");
      }

      return submitActivity(current, playerId, body);
    });
    await deliverTelegramReadyMessages(game.id);
    return NextResponse.json({ ok: true, gameId: game.id, playerId });
  } catch (error) {
    return jsonError(error);
  }
}
