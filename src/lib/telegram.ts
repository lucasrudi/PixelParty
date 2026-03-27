export interface TelegramBotProfile {
  id: number;
  is_bot: true;
  first_name: string;
  username?: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramWebhookUpdate {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    chat: {
      id: number;
      type: string;
    };
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
  };
}

type Environment = Record<string, string | undefined>;

function normalizeTelegramUsername(value?: string) {
  const normalized = value?.trim().replace(/^@/, "") ?? "";
  return normalized || null;
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

async function callTelegramApi<TResponse>(
  method: string,
  body: Record<string, unknown>,
  env: Environment = process.env,
) {
  const token = getTelegramBotToken(env);

  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await response.json()) as {
    ok?: boolean;
    result?: TResponse;
    description?: string;
  };

  if (!response.ok || !data.ok) {
    throw new Error(data.description ?? `Telegram API call failed for ${method}.`);
  }

  return data.result;
}

export async function fetchTelegramBotProfile(
  env: Environment = process.env,
): Promise<TelegramBotProfile> {
  const token = getTelegramBotToken(env);

  if (!token) {
    throw new Error("Missing TELEGRAM_BOT_TOKEN.");
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
    cache: "no-store",
  });
  const data = (await response.json()) as {
    ok?: boolean;
    result?: TelegramBotProfile;
    description?: string;
  };

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

  return callTelegramApi(
    "sendMessage",
    {
      chat_id: chatId,
      text,
      reply_markup: replyMarkup,
    },
    env,
  );
}
