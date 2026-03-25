import { NextResponse } from "next/server";
import { joinGame } from "@/lib/game-engine";
import { jsonError } from "@/lib/route-response";
import { assertSimulatorEnabled } from "@/lib/storage-config";
import { updateGame } from "@/lib/store";
import { JoinGameInput } from "@/lib/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await context.params;
    const body = (await request.json()) as JoinGameInput;
    let joinedPlayerId = "";

    const game = await updateGame(gameId, (current) => {
      if (current.accessMode === "simulator") {
        assertSimulatorEnabled();
      }

      const result = joinGame(current, body);
      joinedPlayerId = result.player.id;
      return result.game;
    });

    return NextResponse.json({
      gameId: game.id,
      playerId: joinedPlayerId,
    });
  } catch (error) {
    return jsonError(error);
  }
}
