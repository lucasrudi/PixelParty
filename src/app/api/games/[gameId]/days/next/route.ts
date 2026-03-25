import { NextResponse } from "next/server";
import { advanceDay } from "@/lib/game-engine";
import { jsonError } from "@/lib/route-response";
import { updateGame } from "@/lib/store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await context.params;
    const game = await updateGame(gameId, (current) => advanceDay(current));
    return NextResponse.json({ ok: true, gameId: game.id, currentDay: game.currentDay, status: game.status });
  } catch (error) {
    return jsonError(error);
  }
}
