import path from "path";
import { submitEvidence } from "@/lib/game-engine";
import { getStoryBeat } from "@/lib/story";
import { getGame, listGames, updateGame } from "@/lib/store";
import { Game, Player, Quest } from "@/lib/types";
import { saveBinaryAsset } from "@/lib/uploads";

export interface TelegramBotProfile {
  id: number;
  is_bot: true;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

interface TelegramUser {
  id?: number;
  is_bot?: boolean;
  first_name?: string;
  username?: string;
}

interface TelegramChat {
  id: number;
  type?: string;
}

interface TelegramPhotoSize {
  file_id: string;
  file_unique_id: string;
}

interface TelegramVideo {
  file_id: string;
  file_name?: string;
  mime_type?: string;
}

interface TelegramMessage {
  message_id?: number;
  text?: string;
  caption?: string;
  from?: TelegramUser;
  chat: TelegramChat;
  photo?: TelegramPhotoSize[];
  video?: TelegramVideo;
}

export interface TelegramUpdate {
  update_id?: number;
  message?: TelegramMessage;
}

export type TelegramWebhookUpdate = TelegramUpdate;

interface TelegramApiEnvelope<T> {
  ok?: boolean;
  result?: T;
  description?: string;
}

interface TelegramFileResponse {
  file_path?: string;
}

type Environment = Record<string, string | undefined>;
type EvidenceMediaKind = "photo" | "video";

interface TelegramMediaSelection {
  contentType?: string;
  fileId: string;
  fileName: string;
  kind: EvidenceMediaKind;
}

interface TelegramAssignment {
  game: Game;
  player: Player;
}

function normalizeTelegramUsername(value?: string) {
  const normalized = value?.trim().replace(/^@/, "") ?? "";
  return normalized || null;
}

function normalizeTelegramHandle(value?: string) {
  const normalized = value?.trim().replace(/^@/, "").toLowerCase() ?? "";
  return normalized ? `@${normalized}` : "";
}

export function getTelegramBotToken(env: Environment = process.env) {
  const token = env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
  return token || null;
}

export function getTelegramBotUsername(env: Environment = process.env) {
  return normalizeTelegramUsername(
    env.TELEGRAM_BOT_USERNAME ?? env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  );
}

export function getTelegramBotUrl(env: Environment = process.env) {
  const username = getTelegramBotUsername(env);
  return username ? `https://t.me/${username}` : null;
}

export function getTelegramBindUrl(
  bindingToken: string,
  env: Environment = process.env,
) {
  const username = getTelegramBotUsername(env);

  if (!username || !bindingToken.trim()) {
    return null;
  }

  return `https://t.me/${username}?start=bind_${bindingToken}`;
}

export function getAppBaseUrl(env: Environment = process.env) {
  const value =
    env.PIXELPARTY_PUBLIC_URL?.trim() ??
    env.APP_URL?.trim() ??
    env.NEXT_PUBLIC_APP_URL?.trim() ??
    env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ??
    "";

  if (!value) {
    return null;
  }

  if (/^https?:\/\//.test(value)) {
    return value.replace(/\/$/, "");
  }

  return `https://${value.replace(/\/$/, "")}`;
}

export function getTelegramWebhookSecret(env: Environment = process.env) {
  const secret = env.TELEGRAM_WEBHOOK_SECRET_TOKEN?.trim() ?? "";
  return secret || null;
}

export function isTelegramBotConfigured(env: Environment = process.env) {
  return Boolean(getTelegramBotToken(env));
}

function getTelegramApiBase(token: string) {
  return `https://api.telegram.org/bot${token}`;
}

function getTelegramFileBase(token: string) {
  return `https://api.telegram.org/file/bot${token}`;
}

async function callTelegramApi<TResponse>(
  method: string,
  body: Record<string, unknown>,
  env: Environment = process.env,
) {
  const token = getTelegramBotToken(env);

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }

  const response = await fetch(`${getTelegramApiBase(token)}/${method}`, {
    body: JSON.stringify(body),
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });
  const data = (await response.json()) as TelegramApiEnvelope<TResponse>;

  if (!response.ok || !data.ok) {
    throw new Error(data.description ?? `Telegram API call failed for ${method}.`);
  }

  return data.result as TResponse;
}

export async function fetchTelegramBotProfile(
  env: Environment = process.env,
): Promise<TelegramBotProfile> {
  const token = getTelegramBotToken(env);

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }

  const response = await fetch(`${getTelegramApiBase(token)}/getMe`, {
    cache: "no-store",
  });
  const data = (await response.json()) as TelegramApiEnvelope<TelegramBotProfile>;

  if (!response.ok || !data.ok || !data.result) {
    throw new Error(data.description ?? "Could not reach the Telegram Bot API.");
  }

  return data.result;
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  options?: {
    urlButton?: {
      label: string;
      url: string;
    };
  },
  env: Environment = process.env,
) {
  const replyMarkup = options?.urlButton
    ? {
        inline_keyboard: [
          [
            {
              text: options.urlButton.label,
              url: options.urlButton.url,
            },
          ],
        ],
      }
    : undefined;

  await callTelegramApi("sendMessage", {
    chat_id: chatId,
    reply_markup: replyMarkup,
    text,
  }, env);
}

export async function sendTelegramText(
  chatId: string,
  text: string,
  env: Environment = process.env,
) {
  if (!isTelegramBotConfigured(env)) {
    return;
  }

  await sendTelegramMessage(chatId, text, undefined, env);
}

export function buildLobbyTelegramText(
  game: Game,
  player: Player,
  event: "created" | "joined",
  env: Environment = process.env,
) {
  const baseUrl = getAppBaseUrl(env);
  const gameUrl = baseUrl ? `${baseUrl}/game/${game.id}?player=${player.id}` : null;

  return [
    event === "created"
      ? `PixelParty lobby created for ${game.title}.`
      : `You joined the PixelParty lobby for ${game.title}.`,
    `Invite code: ${game.inviteCode}`,
    player.telegramHandle ? `Linked handle: ${player.telegramHandle}` : null,
    gameUrl ? `Open your game: ${gameUrl}` : null,
    "When the host starts the trip, your daily quest can arrive here automatically.",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n\n");
}

export async function notifyPlayerOfLobbyLink(
  game: Game,
  player: Player,
  event: "created" | "joined",
  env: Environment = process.env,
) {
  if (!player.telegramChatId) {
    return;
  }

  const baseUrl = getAppBaseUrl(env);
  const gameUrl = baseUrl ? `${baseUrl}/game/${game.id}?player=${player.id}` : null;

  await sendTelegramMessage(
    player.telegramChatId,
    buildLobbyTelegramText(game, player, event, env),
    gameUrl
      ? {
          urlButton: {
            label: "Open PixelParty",
            url: gameUrl,
          },
        }
      : undefined,
    env,
  );
}

function todayQuestForPlayer(game: Game, playerId: string) {
  return game.quests.find(
    (quest) => quest.playerId === playerId && quest.dayNumber === game.currentDay,
  );
}

export function buildDailyQuestText(game: Game, player: Player, quest?: Quest) {
  const beat = getStoryBeat(game.currentDay || 1, game.totalDays);
  const todayQuest = quest ?? todayQuestForPlayer(game, player.id);

  if (!todayQuest) {
    return [
      `${game.title}`,
      `Day ${game.currentDay} is live at ${beat.location}.`,
      "No quest is assigned to you yet. Ping the host if this looks wrong.",
    ].join("\n\n");
  }

  return [
    `${game.title}`,
    `Day ${game.currentDay}: ${beat.label}`,
    `Quest: ${todayQuest.title}`,
    todayQuest.brief,
    `Proof needed: ${todayQuest.evidencePrompt}`,
    `Points: ${todayQuest.points}`,
    'Reply with a photo or video and add a caption. Example: "Sunrise proof from the beach".',
    "If you're in multiple games, start the caption with INVITE: description.",
  ].join("\n\n");
}

function parseInviteCodeFromCommand(text: string) {
  const [, inviteCode = ""] = text.trim().split(/\s+/, 2);
  const normalized = inviteCode.trim().toUpperCase();
  return /^[A-Z0-9]{6}$/.test(normalized) ? normalized : "";
}

function parseInviteCodeFromCaption(caption: string) {
  const match = caption.trim().match(/^([A-Z0-9]{6})\s*:\s*([\s\S]+)$/);

  if (!match) {
    return { description: caption.trim(), inviteCode: "" };
  }

  return {
    description: (match[2] ?? "").trim(),
    inviteCode: match[1] ?? "",
  };
}

function chooseAssignment(
  assignments: TelegramAssignment[],
  inviteCode?: string,
) {
  const filtered = inviteCode
    ? assignments.filter(
        ({ game }) => game.inviteCode.toUpperCase() === inviteCode.toUpperCase(),
      )
    : assignments;

  if (filtered.length === 0) {
    return null;
  }

  if (filtered.length === 1) {
    return filtered[0];
  }

  const active = filtered.filter(({ game }) => game.status === "active");

  if (active.length === 1) {
    return active[0];
  }

  throw new Error(
    "Multiple games match this Telegram account. Use /today INVITE or start your evidence caption with INVITE: description.",
  );
}

async function fetchTelegramAssignments(chatId: string, username?: string) {
  const handle = normalizeTelegramHandle(username);
  const games = await listGames();

  return games
    .filter((game) => game.accessMode === "telegram")
    .flatMap((game) =>
      game.players
        .filter(
          (player) =>
            player.telegramChatId === chatId ||
            (handle && normalizeTelegramHandle(player.telegramHandle) === handle),
        )
        .map((player) => ({ game, player })),
    )
    .sort((left, right) => right.game.updatedAt.localeCompare(left.game.updatedAt));
}

export async function linkTelegramChat(username: string | undefined, chatId: string) {
  const handle = normalizeTelegramHandle(username);

  if (!handle) {
    return [];
  }

  const games = await listGames();
  const matchingGames = games.filter(
    (game) =>
      game.accessMode === "telegram" &&
      game.players.some(
        (player) => normalizeTelegramHandle(player.telegramHandle) === handle,
      ),
  );

  for (const game of matchingGames) {
    await updateGame(game.id, (current) => {
      current.players = current.players.map((player) =>
        normalizeTelegramHandle(player.telegramHandle) === handle
          ? { ...player, telegramChatId: chatId }
          : player,
      );
      current.updatedAt = new Date().toISOString();
      return current;
    });
  }

  return matchingGames;
}

export async function sendTodayQuestForChat(
  chatId: string,
  username?: string,
  inviteCode?: string,
  env: Environment = process.env,
) {
  const assignments = await fetchTelegramAssignments(chatId, username);
  const match = chooseAssignment(assignments, inviteCode);

  if (!match) {
    throw new Error(
      "I couldn't match this Telegram account to a PixelParty player. Join the game with your Telegram handle first, then send /start here.",
    );
  }

  if (match.game.status !== "active") {
    await sendTelegramText(
      chatId,
      `${match.game.title} is still in the lobby. Your quest will land here as soon as the host starts the game.`,
      env,
    );
    return;
  }

  const freshGame = (await getGame(match.game.id)) ?? match.game;
  const freshPlayer =
    freshGame.players.find((player) => player.id === match.player.id) ?? match.player;

  await sendTelegramText(chatId, buildDailyQuestText(freshGame, freshPlayer), env);
}

function pickTelegramMedia(message: TelegramMessage) {
  const photos = message.photo ?? [];
  const largestPhoto = photos.at(-1);

  if (message.video) {
    const extension = path.extname(message.video.file_name ?? "") || ".mp4";

    return {
      contentType: message.video.mime_type ?? "video/mp4",
      fileId: message.video.file_id,
      fileName: message.video.file_name ?? `telegram-video${extension}`,
      kind: "video" as const,
    };
  }

  if (largestPhoto) {
    return {
      contentType: "image/jpeg",
      fileId: largestPhoto.file_id,
      fileName: `telegram-photo-${largestPhoto.file_unique_id}.jpg`,
      kind: "photo" as const,
    };
  }

  return null;
}

async function downloadTelegramMedia(
  media: TelegramMediaSelection,
  env: Environment = process.env,
) {
  const token = getTelegramBotToken(env);

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured.");
  }

  const fileResult = await callTelegramApi<TelegramFileResponse>(
    "getFile",
    { file_id: media.fileId },
    env,
  );

  if (!fileResult.file_path) {
    throw new Error("Telegram did not return a downloadable file path.");
  }

  const response = await fetch(`${getTelegramFileBase(token)}/${fileResult.file_path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Telegram file download failed with status ${response.status}.`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  return saveBinaryAsset({
    bytes,
    contentType: media.contentType,
    fileName: media.fileName,
  });
}

export async function submitTelegramEvidence(
  update: TelegramUpdate,
  env: Environment = process.env,
) {
  const message = update.message;

  if (!message) {
    throw new Error("Telegram update did not include a message.");
  }

  const media = pickTelegramMedia(message);

  if (!media) {
    throw new Error("Send a photo or video with a caption to submit evidence.");
  }

  const chatId = String(message.chat.id);
  const { description, inviteCode } = parseInviteCodeFromCaption(message.caption ?? "");
  const assignments = await fetchTelegramAssignments(chatId, message.from?.username);
  const match = chooseAssignment(assignments, inviteCode);

  if (!match) {
    throw new Error(
      "I couldn't match this Telegram account to an active PixelParty player. Send /start first, then try again.",
    );
  }

  if (match.game.status !== "active") {
    throw new Error("This game is not active yet, so today's quest cannot accept evidence.");
  }

  const quest = todayQuestForPlayer(match.game, match.player.id);

  if (!quest) {
    throw new Error("There is no quest assigned to you for today.");
  }

  const savedAsset = await downloadTelegramMedia(media, env);
  const finalDescription = description || "Telegram evidence submission";

  await updateGame(match.game.id, (current) =>
    submitEvidence(current, match.player.id, quest.id, {
      assetUrl: savedAsset.assetUrl,
      description: finalDescription,
      fileName: savedAsset.fileName,
      kind: media.kind,
    }),
  );

  return {
    chatId,
    confirmation: `Evidence received for "${quest.title}". The validators have been notified.`,
  };
}

export async function notifyPlayersOfCurrentDay(
  gameId: string,
  env: Environment = process.env,
) {
  if (!isTelegramBotConfigured(env)) {
    return;
  }

  const game = await getGame(gameId);

  if (!game || game.accessMode !== "telegram" || game.status !== "active") {
    return;
  }

  for (const player of game.players) {
    if (!player.telegramChatId) {
      continue;
    }

    const quest = todayQuestForPlayer(game, player.id);
    await sendTelegramText(
      player.telegramChatId,
      buildDailyQuestText(game, player, quest),
      env,
    );
  }
}

export function isTelegramCommand(update: TelegramUpdate, command: string) {
  const text = update.message?.text?.trim() ?? "";
  return text === command || text.startsWith(`${command} `);
}

export function getInviteCodeFromTodayCommand(update: TelegramUpdate) {
  return parseInviteCodeFromCommand(update.message?.text ?? "");
}
