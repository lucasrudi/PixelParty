import { Game, GameMessage, Player } from "@/lib/types";
import { getGame, updateGame } from "@/lib/store";
import {
  getAppBaseUrl,
  isTelegramBotConfigured,
  sendTelegramMessage,
} from "@/lib/telegram";

function formatTelegramMessage(message: GameMessage) {
  return `${message.title}\n\n${message.body}`;
}

function buildPlayerGameUrl(gameId: string, playerId: string) {
  const baseUrl = getAppBaseUrl();

  if (!baseUrl) {
    return null;
  }

  return `${baseUrl}/game/${gameId}?player=${playerId}`;
}

function getIntendedRecipients(game: Game, message: GameMessage) {
  if (message.audience === "player" && message.playerId) {
    return game.players.filter((player) => player.id === message.playerId);
  }

  return game.players;
}

export async function deliverTelegramReadyMessages(gameId: string) {
  if (!isTelegramBotConfigured()) {
    return { deliveredCount: 0 };
  }

  const game = await getGame(gameId);

  if (!game || game.accessMode !== "telegram") {
    return { deliveredCount: 0 };
  }

  const deliveredByMessageId = new Map<string, string[]>();
  let deliveredCount = 0;

  for (const message of game.messages) {
    if (message.channel !== "telegram-ready") {
      continue;
    }

    const recipients = getIntendedRecipients(game, message);

    for (const player of recipients) {
      const chatId = player.telegramChatId;

      if (!chatId) {
        continue;
      }

      if (message.telegramDeliveredTo?.includes(player.id)) {
        continue;
      }

      await sendTelegramMessage(
        chatId,
        formatTelegramMessage(message),
        {
          urlButton: buildPlayerGameUrl(game.id, player.id)
            ? {
                label: "Open PixelParty",
                url: buildPlayerGameUrl(game.id, player.id) as string,
              }
            : undefined,
        },
      );

      const delivered = deliveredByMessageId.get(message.id) ?? [];
      delivered.push(player.id);
      deliveredByMessageId.set(message.id, delivered);
      deliveredCount += 1;
    }
  }

  if (deliveredByMessageId.size > 0) {
    await updateGame(game.id, (current) => {
      current.messages = current.messages.map((message) => {
        const nextDelivered = deliveredByMessageId.get(message.id);

        if (!nextDelivered || nextDelivered.length === 0) {
          return message;
        }

        return {
          ...message,
          telegramDeliveredTo: [
            ...(message.telegramDeliveredTo ?? []),
            ...nextDelivered.filter(
              (playerId) => !message.telegramDeliveredTo?.includes(playerId),
            ),
          ],
        };
      });
      current.updatedAt = new Date().toISOString();
      return current;
    });
  }

  return { deliveredCount };
}

export function getTelegramLinkedForPlayer(player?: Player) {
  return Boolean(player?.telegramChatId);
}
