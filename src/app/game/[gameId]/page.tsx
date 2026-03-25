import { notFound } from "next/navigation";
import { GameClient } from "@/components/GameClient";
import { getGame } from "@/lib/store";

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

  const currentPlayer = game.players.find((player) => player.id === playerId);

  return <GameClient game={game} currentPlayer={currentPlayer} />;
}
