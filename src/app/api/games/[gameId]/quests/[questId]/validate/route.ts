import { NextResponse } from "next/server";
import { UserFacingError } from "@/lib/errors";
import { jsonError } from "@/lib/route-response";
import { assertSimulatorEnabled } from "@/lib/storage-config";
import { updateGame } from "@/lib/store";
import { validateQuest } from "@/lib/game-engine";
import { deliverTelegramReadyMessages } from "@/lib/telegram-delivery";
import {
  getCookieValue,
  getTelegramSession,
  TELEGRAM_AUTH_COOKIE_NAME,
} from "@/lib/telegram-auth";
import { ValidateQuestInput } from "@/lib/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ gameId: string; questId: string }> },
) {
  try {
    const { gameId, questId } = await context.params;
    const body = (await request.json()) as ValidateQuestInput & { playerId: string };
    const telegramSession = getTelegramSession(
      getCookieValue(request.headers.get("cookie"), TELEGRAM_AUTH_COOKIE_NAME),
    );

    const game = await updateGame(gameId, (current) => {
      if (current.accessMode === "simulator") {
        assertSimulatorEnabled();
        return validateQuest(current, body.playerId, questId, {
          decision: body.decision,
          note: body.note,
        });
      }

      const sessionPlayer = current.players.find(
        (p) => p.telegramUserId === telegramSession?.id,
      );
      if (!sessionPlayer) {
        throw new UserFacingError("Authentication required to validate a quest.");
      }

      return validateQuest(current, sessionPlayer.id, questId, {
        decision: body.decision,
        note: body.note,
      });
    });

    await deliverTelegramReadyMessages(game.id);
    return NextResponse.json({ ok: true, gameId: game.id, questId });
  } catch (error) {
    return jsonError(error);
  }
}
