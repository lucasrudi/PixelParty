import { NextResponse } from "next/server";
import { jsonError } from "@/lib/route-response";
import { getGame } from "@/lib/store";

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
