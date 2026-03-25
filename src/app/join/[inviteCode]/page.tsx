import { notFound } from "next/navigation";
import { JoinClient } from "@/components/JoinClient";
import { isSimulatorEnabled } from "@/lib/storage-config";
import { getGameByInvite } from "@/lib/store";

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

  return <JoinClient game={game} />;
}
