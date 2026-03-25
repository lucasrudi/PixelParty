import { NextResponse } from "next/server";
import { assertCanManageGame } from "@/lib/game-engine";
import { jsonError } from "@/lib/route-response";
import { deleteGame, getGame } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await context.params;
    const game = await getGame(gameId);

    if (!game) {
      return NextResponse.json({ error: "Game not found." }, { status: 404 });
    }

    return NextResponse.json(game);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ gameId: string }> },
) {
  try {
    const { gameId } = await context.params;
    const game = await getGame(gameId);
    const body = (await request.json().catch(() => ({}))) as { playerId?: string };

    if (!game) {
      return NextResponse.json({ error: "Game not found." }, { status: 404 });
    }

    assertCanManageGame(game, body.playerId);
    await deleteGame(gameId);

    return NextResponse.json({ ok: true, gameId });
  } catch (error) {
    return jsonError(error);
  }
}
