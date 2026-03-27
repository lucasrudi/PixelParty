import { NextResponse } from "next/server";
import { startGame } from "@/lib/game-engine";
import { jsonError } from "@/lib/route-response";
import { assertSimulatorEnabled } from "@/lib/storage-config";
import { updateGame } from "@/lib/store";
import { deliverTelegramReadyMessages } from "@/lib/telegram-delivery";

export async function POST(
  _request: Request,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await context.params;
    const game = await updateGame(gameId, (current) => {
      if (current.accessMode === "simulator") {
        assertSimulatorEnabled();
      }

      return startGame(current);
    });
    await deliverTelegramReadyMessages(game.id);
    return NextResponse.json({ ok: true, gameId: game.id, currentDay: game.currentDay });
  } catch (error) {
    return jsonError(error);
  }
}
