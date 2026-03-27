import { NextResponse } from "next/server";
import { jsonError } from "@/lib/route-response";
import {
  bindTelegramPlayer,
  deliverTelegramReadyMessages,
  resolveTelegramBindingToken,
} from "@/lib/telegram-delivery";
import {
  getAppBaseUrl,
  getTelegramWebhookSecret,
  sendTelegramMessage,
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
    const payload = extractStartPayload(message?.text);

    if (!message?.from || !message.chat) {
      return NextResponse.json({ ok: true });
    }

    if (!payload?.startsWith("bind_")) {
      await sendTelegramMessage(
        String(message.chat.id),
        "PixelParty bot is online. Open the game dashboard and use the Telegram bind link for your player to connect this chat.",
        getAppBaseUrl()
          ? {
              urlButton: {
                label: "Open PixelParty",
                url: getAppBaseUrl() as string,
              },
            }
          : undefined,
      );
      return NextResponse.json({ ok: true });
    }

    const bindingToken = payload.slice("bind_".length);
    const resolved = await resolveTelegramBindingToken(bindingToken);

    if (!resolved) {
      await sendTelegramMessage(
        String(message.chat.id),
        "That PixelParty bind link is invalid or expired. Open the game dashboard again and generate a fresh bind link.",
      );
      return NextResponse.json({ ok: true });
    }

    await bindTelegramPlayer({
      gameId: resolved.game.id,
      playerId: resolved.player.id,
      telegramUserId: String(message.from.id),
      chatId: String(message.chat.id),
      telegramUsername: message.from.username,
    });

    const playerUrl = getAppBaseUrl()
      ? `${getAppBaseUrl()}/game/${resolved.game.id}?player=${resolved.player.id}`
      : null;
    const handleNote =
      resolved.player.telegramHandle && message.from.username
        ? `\n\nHandle on file: ${resolved.player.telegramHandle}\nTelegram account: @${message.from.username}`
        : "";

    await sendTelegramMessage(
      String(message.chat.id),
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
  } catch (error) {
    return jsonError(error, 502);
  }
}
