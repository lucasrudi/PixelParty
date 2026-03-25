import { NextResponse } from "next/server";
import { submitEvidence } from "@/lib/game-engine";
import { jsonError } from "@/lib/route-response";
import { updateGame } from "@/lib/store";
import { saveBrowserFile } from "@/lib/uploads";

export async function POST(
  request: Request,
  context: { params: Promise<{ gameId: string; questId: string }> },
) {
  try {
    const { gameId, questId } = await context.params;
    const formData = await request.formData();
    const playerId = String(formData.get("playerId") ?? "");
    const description = String(formData.get("description") ?? "");
    const kind = String(formData.get("kind") ?? "photo");
    const proofUrl = String(formData.get("proofUrl") ?? "");
    const file = formData.get("file");

    let assetUrl = proofUrl.trim();
    let fileName: string | undefined;

    if (file instanceof File && file.size > 0) {
      const saved = await saveBrowserFile(file);
      assetUrl = saved.assetUrl;
      fileName = saved.fileName;
    }

    const game = await updateGame(gameId, (current) =>
      submitEvidence(current, playerId, questId, {
        description,
        kind: kind === "video" ? "video" : "photo",
        assetUrl,
        fileName,
      }),
    );

    return NextResponse.json({ ok: true, gameId: game.id, questId });
  } catch (error) {
    return jsonError(error);
  }
}
