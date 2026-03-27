import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { JoinClient } from "@/components/JoinClient";
import { isSimulatorEnabled } from "@/lib/storage-config";
import { getGameByInvite } from "@/lib/store";
import {
  getTelegramSession,
  isTelegramLoginEnabled,
  TELEGRAM_AUTH_COOKIE_NAME,
} from "@/lib/telegram-auth";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { inviteCode } = await params;
  const game = await getGameByInvite(inviteCode);

  if (!game) {
    notFound();
  }

  if (game.accessMode === "simulator" && !isSimulatorEnabled()) {
    notFound();
  }

  const cookieStore = await cookies();
  const telegramAuth = getTelegramSession(
    cookieStore.get(TELEGRAM_AUTH_COOKIE_NAME)?.value,
  );

  return (
    <JoinClient
      game={game}
      telegramAuth={telegramAuth}
      telegramLoginEnabled={isTelegramLoginEnabled()}
    />
  );
}
