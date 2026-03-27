import { cookies } from "next/headers";
import { HomeClient } from "@/components/HomeClient";
import { isSimulatorEnabled } from "@/lib/storage-config";
import {
  getTelegramSession,
  isTelegramLoginEnabled,
  TELEGRAM_AUTH_COOKIE_NAME,
} from "@/lib/telegram-auth";
import { getTelegramBotUsername } from "@/lib/telegram";

export default async function Home() {
  const cookieStore = await cookies();
  const telegramAuth = getTelegramSession(
    cookieStore.get(TELEGRAM_AUTH_COOKIE_NAME)?.value,
  );

  return (
    <HomeClient
      showSimulatorLink={isSimulatorEnabled()}
      telegramAuth={telegramAuth}
      telegramBotUsername={getTelegramBotUsername()}
      telegramLoginEnabled={isTelegramLoginEnabled()}
    />
  );
}
