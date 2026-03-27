import { HomeClient } from "@/components/HomeClient";
import { isSimulatorEnabled } from "@/lib/storage-config";
import { getTelegramBotUsername } from "@/lib/telegram";

export default function Home() {
  return (
    <HomeClient
      showSimulatorLink={isSimulatorEnabled()}
      telegramBotUsername={getTelegramBotUsername()}
    />
  );
}
