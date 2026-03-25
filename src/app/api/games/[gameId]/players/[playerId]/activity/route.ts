import { NextResponse } from "next/server";
import { submitActivity } from "@/lib/game-engine";
import { jsonError } from "@/lib/route-response";
import { assertSimulatorEnabled } from "@/lib/storage-config";
import { updateGame } from "@/lib/store";
import { SubmitActivityInput } from "@/lib/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ gameId: string; playerId: string }> },
) {
  try {
    const { gameId, playerId } = await context.params;
    const body = (await request.json()) as SubmitActivityInput;
    const game = await updateGame(gameId, (current) => {
      if (current.accessMode === "simulator") {
        assertSimulatorEnabled();
      }

      return submitActivity(current, playerId, body);
    });
    return NextResponse.json({ ok: true, gameId: game.id, playerId });
  } catch (error) {
    return jsonError(error);
  }
}
