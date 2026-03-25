import { NextResponse } from "next/server";
import { assertCanManageGame, resetGame } from "@/lib/game-engine";
import { jsonError } from "@/lib/route-response";
import { updateGame } from "@/lib/store";

export async function POST(
  request: Request,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await context.params;
    const body = (await request.json().catch(() => ({}))) as { playerId?: string };

    const game = await updateGame(gameId, (current) => {
      assertCanManageGame(current, body.playerId);
      return resetGame(current);
    });

    return NextResponse.json({ ok: true, gameId: game.id, status: game.status });
  } catch (error) {
    return jsonError(error);
  }
}
