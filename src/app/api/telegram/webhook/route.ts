import { NextResponse } from "next/server";
import { jsonError } from "@/lib/route-response";
import { logServerWarning } from "@/lib/server-log";
import {
  getInviteCodeFromTodayCommand,
  getTelegramWebhookSecret,
  isTelegramCommand,
  linkTelegramChat,
  sendTelegramText,
  sendTodayQuestForChat,
  submitTelegramEvidence,
  TelegramWebhookUpdate,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const expectedSecret = getTelegramWebhookSecret();
    const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token");

    if (expectedSecret && receivedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Invalid Telegram webhook secret." }, { status: 401 });
    }

    const update = (await request.json()) as TelegramWebhookUpdate;
    const message = update.message;

    if (!message) {
      return NextResponse.json({ ok: true });
    }

    const chatId = String(message.chat.id);
    const username = message.from?.username;

    if (isTelegramCommand(update, "/start")) {
      const linkedGames = await linkTelegramChat(username, chatId);

      if (linkedGames.length === 0) {
        await sendTelegramText(
          chatId,
          "I couldn't find a PixelParty player with this Telegram username yet. Join the game with this handle first, then send /start again.",
        );
        return NextResponse.json({ ok: true });
      }

      await sendTelegramText(
        chatId,
        `Linked this chat to ${linkedGames.length} PixelParty game${linkedGames.length === 1 ? "" : "s"}. Send /today any time to get your current quest.`,
      );
      await sendTodayQuestForChat(chatId, username).catch((error) =>
        logServerWarning("telegram.command.today", error, {
          chatId,
          command: "/start",
          username,
        }),
      );

      return NextResponse.json({ ok: true });
    }

    if (isTelegramCommand(update, "/today")) {
      await sendTodayQuestForChat(
        chatId,
        username,
        getInviteCodeFromTodayCommand(update),
      );
      return NextResponse.json({ ok: true });
    }

    if (message.photo?.length || message.video) {
      const result = await submitTelegramEvidence(update);
      await sendTelegramText(result.chatId, result.confirmation);
      return NextResponse.json({ ok: true });
    }

    await sendTelegramText(
      chatId,
      "Use /today to get your quest, then send a photo or video with a caption to submit evidence.",
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, 502);
  }
}
