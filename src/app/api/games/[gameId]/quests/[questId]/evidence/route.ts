import { NextResponse } from "next/server";
import {
  assertEvidenceRequestSize,
  parseEvidenceRequest,
} from "@/lib/evidence-request";
import { submitEvidence } from "@/lib/game-engine";
import { UserFacingError } from "@/lib/errors";
import { jsonError } from "@/lib/route-response";
import { assertSimulatorEnabled } from "@/lib/storage-config";
import { updateGame } from "@/lib/store";
import { deliverTelegramReadyMessages } from "@/lib/telegram-delivery";
import {
  getCookieValue,
  getTelegramSession,
  TELEGRAM_AUTH_COOKIE_NAME,
} from "@/lib/telegram-auth";
import { saveBrowserFile } from "@/lib/uploads";

export async function POST(
  request: Request,
  context: { params: Promise<{ gameId: string; questId: string }> },
) {
  try {
    const { gameId, questId } = await context.params;
    assertEvidenceRequestSize(request);
    const formData = await request.formData();
    const body = parseEvidenceRequest(formData);
    const telegramSession = getTelegramSession(
      getCookieValue(request.headers.get("cookie"), TELEGRAM_AUTH_COOKIE_NAME),
    );

    let assetUrl = body.proofUrl;
    let fileName: string | undefined;

    if (body.file) {
      const saved = await saveBrowserFile(body.file);
      assetUrl = saved.assetUrl;
      fileName = saved.fileName;
    }

    const game = await updateGame(gameId, (current) => {
      if (current.accessMode === "simulator") {
        assertSimulatorEnabled();
        if (!body.playerId) {
          throw new UserFacingError("A simulator player id is required to submit evidence.");
        }

        return submitEvidence(current, body.playerId, questId, {
          description: body.description,
          kind: body.kind,
          assetUrl,
          fileName,
        });
      }

      const sessionPlayer = current.players.find(
        (p) => p.telegramUserId === telegramSession?.id,
      );
      if (!sessionPlayer) {
        throw new UserFacingError("Authentication required to submit evidence.");
      }

      return submitEvidence(current, sessionPlayer.id, questId, {
        description: body.description,
        kind: body.kind,
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
