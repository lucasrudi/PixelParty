import { NextResponse } from "next/server";
import { submitEvidence } from "@/lib/game-engine";
import { jsonError } from "@/lib/route-response";
import { assertSimulatorEnabled } from "@/lib/storage-config";
import { updateGame } from "@/lib/store";
import { deliverTelegramReadyMessages } from "@/lib/telegram-delivery";
import {
  EVIDENCE_KINDS,
  isEvidenceKind,
  MAX_EVIDENCE_DESCRIPTION_LENGTH,
} from "@/lib/types";
import { saveBrowserFile } from "@/lib/uploads";

export async function POST(
  request: Request,
  context: { params: Promise<{ gameId: string; questId: string }> },
) {
  try {
    const { gameId, questId } = await context.params;
    const formData = await request.formData();
    const playerId = String(formData.get("playerId") ?? "");
    const description = String(formData.get("description") ?? "").trim();
    const kind = String(formData.get("kind") ?? "photo");
    const proofUrl = String(formData.get("proofUrl") ?? "");
    const file = formData.get("file");

    if (!isEvidenceKind(kind)) {
      throw new Error(
        `Evidence type must be one of: ${EVIDENCE_KINDS.join(", ")}.`,
      );
    }

    if (description.length > MAX_EVIDENCE_DESCRIPTION_LENGTH) {
      throw new Error(
        `Evidence descriptions must be ${MAX_EVIDENCE_DESCRIPTION_LENGTH} characters or fewer.`,
      );
    }

    let assetUrl = proofUrl.trim();
    let fileName: string | undefined;

    if (file instanceof File && file.size > 0) {
      const saved = await saveBrowserFile(file);
      assetUrl = saved.assetUrl;
      fileName = saved.fileName;
    }

    const game = await updateGame(gameId, (current) => {
      if (current.accessMode === "simulator") {
        assertSimulatorEnabled();
      }

      return submitEvidence(current, playerId, questId, {
        description,
        kind,
        assetUrl,
        fileName,
      });
    });

    await deliverTelegramReadyMessages(game.id);
    return NextResponse.json({ ok: true, gameId: game.id, questId });
  } catch (error) {
    return jsonError(error);
  }
}
