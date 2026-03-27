type TelegramWindow = Window & {
  Telegram?: {
    WebApp?: {
      initDataUnsafe?: {
        user?: {
          id?: number | string;
        };
      };
    };
  };
};

function normalizeChatId(value?: number | string) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }

  return "";
}

export function readTelegramWebAppChatId() {
  if (typeof window === "undefined") {
    return "";
  }

  const telegramWindow = window as TelegramWindow;
  return normalizeChatId(telegramWindow.Telegram?.WebApp?.initDataUnsafe?.user?.id);
}
