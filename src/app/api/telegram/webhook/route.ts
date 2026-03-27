import { NextResponse } from "next/server";
import { jsonError } from "@/lib/route-response";
import {
  bindTelegramPlayer,
  deliverTelegramReadyMessages,
  resolveTelegramBindingToken,
} from "@/lib/telegram-delivery";
import {
  getAppBaseUrl,
  getInviteCodeFromTodayCommand,
  getTelegramWebhookSecret,
  isTelegramCommand,
  linkTelegramChat,
  sendTelegramMessage,
  sendTelegramText,
  sendTodayQuestForChat,
  submitTelegramEvidence,
  TelegramWebhookUpdate,
} from "@/lib/telegram";

export const dynamic = "force-dynamic";

function extractStartPayload(text?: string) {
  if (!text) {
    return null;
  }

  const [command, payload] = text.trim().split(/\s+/, 2);

  if (command !== "/start") {
    return null;
  }

  return payload ?? null;
}

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
    const payload = extractStartPayload(message.text);

    if (payload?.startsWith("bind_") && message.from?.id) {
      const bindingToken = payload.slice("bind_".length);
      const resolved = await resolveTelegramBindingToken(bindingToken);

      if (!resolved) {
        await sendTelegramMessage(
          chatId,
          "That PixelParty bind link is invalid or expired. Open the game dashboard again and generate a fresh bind link.",
        );
        return NextResponse.json({ ok: true });
      }

      await bindTelegramPlayer({
        chatId,
        gameId: resolved.game.id,
        playerId: resolved.player.id,
        telegramUserId: String(message.from.id),
        telegramUsername: username,
      });
      await linkTelegramChat(username, chatId).catch(() => undefined);

      const playerUrl = getAppBaseUrl()
        ? `${getAppBaseUrl()}/game/${resolved.game.id}?player=${resolved.player.id}`
        : null;
      const handleNote =
        resolved.player.telegramHandle && username
          ? `\n\nHandle on file: ${resolved.player.telegramHandle}\nTelegram account: @${username}`
          : "";

      await sendTelegramMessage(
        chatId,
        `PixelParty linked successfully for ${resolved.player.name} in ${resolved.game.title}.${handleNote}`,
        playerUrl
          ? {
              urlButton: {
                label: "Open your game dashboard",
                url: playerUrl,
              },
            }
          : undefined,
      );

      await deliverTelegramReadyMessages(resolved.game.id);
      return NextResponse.json({ ok: true });
    }

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
      await sendTodayQuestForChat(chatId, username).catch(() => undefined);

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
