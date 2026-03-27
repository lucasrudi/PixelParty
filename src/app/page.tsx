import { HomeClient } from "@/components/HomeClient";
import { isSimulatorEnabled } from "@/lib/storage-config";
import { getTelegramBotUrl, getTelegramBotUsername } from "@/lib/telegram";

export default function Home() {
  return (
    <HomeClient
      showSimulatorLink={isSimulatorEnabled()}
      telegramBotUrl={getTelegramBotUrl()}
      telegramBotUsername={getTelegramBotUsername()}
    />
  );
}
