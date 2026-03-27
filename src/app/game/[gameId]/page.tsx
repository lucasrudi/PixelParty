import { notFound } from "next/navigation";
import { GameClient } from "@/components/GameClient";
import { isSimulatorEnabled } from "@/lib/storage-config";
import { getGame } from "@/lib/store";
import { getTelegramLinkedForPlayer } from "@/lib/telegram-delivery";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ player?: string }>;
}) {
  const { gameId } = await params;
  const { player: playerId } = await searchParams;
  const game = await getGame(gameId);

  if (!game) {
    notFound();
  }

  if (game.accessMode === "simulator" && !isSimulatorEnabled()) {
    notFound();
  }

  const currentPlayer = game.players.find((player) => player.id === playerId);
  const isTelegramLinked = getTelegramLinkedForPlayer(currentPlayer);

  return (
    <GameClient
      game={game}
      currentPlayer={currentPlayer}
      isTelegramLinked={isTelegramLinked}
    />
  );
}
