import { NextResponse } from "next/server";
import { leaveGame } from "@/lib/game-engine";
import { jsonError } from "@/lib/route-response";
import { assertSimulatorEnabled } from "@/lib/storage-config";
import { getGame, updateGame } from "@/lib/store";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ gameId: string; playerId: string }> },
) {
  try {
    const { gameId, playerId } = await context.params;
    const game = await getGame(gameId);

    if (!game) {
      return NextResponse.json({ error: "Game not found." }, { status: 404 });
    }

    if (game.accessMode === "simulator") {
      assertSimulatorEnabled();
    }

    await updateGame(gameId, (current) => leaveGame(current, playerId));

    return NextResponse.json({ ok: true, gameId, playerId });
  } catch (error) {
    return jsonError(error);
  }
}
