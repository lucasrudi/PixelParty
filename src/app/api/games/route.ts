import { NextResponse } from "next/server";
import { createGame } from "@/lib/game-engine";
import { jsonError } from "@/lib/route-response";
import { assertSimulatorEnabled } from "@/lib/storage-config";
import { saveGame } from "@/lib/store";
import { CreateGameInput } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateGameInput;

    if (body.accessMode === "simulator") {
      assertSimulatorEnabled();
    }

    const game = createGame(body);
    await saveGame(game);

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
