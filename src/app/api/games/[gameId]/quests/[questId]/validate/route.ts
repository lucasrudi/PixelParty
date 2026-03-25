import { NextResponse } from "next/server";
import { jsonError } from "@/lib/route-response";
import { assertSimulatorEnabled } from "@/lib/storage-config";
import { updateGame } from "@/lib/store";
import { validateQuest } from "@/lib/game-engine";
import { ValidateQuestInput } from "@/lib/types";

export async function POST(
  request: Request,
  context: { params: Promise<{ gameId: string; questId: string }> },
) {
  try {
    const { gameId, questId } = await context.params;
    const body = (await request.json()) as ValidateQuestInput & { playerId: string };

    const game = await updateGame(gameId, (current) => {
      if (current.accessMode === "simulator") {
        assertSimulatorEnabled();
      }

      return validateQuest(current, body.playerId, questId, {
        decision: body.decision,
        note: body.note,
      });
    });

    return NextResponse.json({ ok: true, gameId: game.id, questId });
  } catch (error) {
    return jsonError(error);
  }
}
