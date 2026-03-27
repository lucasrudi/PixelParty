import { NextResponse } from "next/server";
import { assertCanManageGame, finishGame } from "@/lib/game-engine";
import { jsonError } from "@/lib/route-response";
import { assertSimulatorEnabled } from "@/lib/storage-config";
import { updateGame } from "@/lib/store";
import { deliverTelegramReadyMessages } from "@/lib/telegram-delivery";

export async function POST(
  request: Request,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { playerId?: string };

    const game = await updateGame(gameId, (current) => {
      if (current.accessMode === "simulator") {
        assertSimulatorEnabled();
      }

      assertCanManageGame(current, body.playerId);
      return finishGame(current);
    });
    await deliverTelegramReadyMessages(game.id);
    return NextResponse.json({ ok: true, gameId: game.id, status: game.status });
  } catch (error) {
    return jsonError(error);
  }
}
