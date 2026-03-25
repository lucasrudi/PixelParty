import {
  createGame,
  joinGame,
  startGame,
  submitEvidence,
} from "@/lib/game-engine";
import { Game, Player } from "@/lib/types";

export function buildStartedSimulatorGame() {
  const game = createGame({
    title: "Simulator Bash",
    groomName: "Tincho",
    hostName: "Fede",
    startDate: "2026-03-25",
    endDate: "2026-03-27",
    accessMode: "simulator",
  });

  joinGame(game, { name: "Mauri" });
  joinGame(game, { name: "Seba" });
  startGame(game);

  return {
    game,
    host: game.players.find((player) => player.id === game.hostPlayerId) as Player,
    mauri: game.players.find((player) => player.name === "Mauri") as Player,
    seba: game.players.find((player) => player.name === "Seba") as Player,
  };
}

export function buildStartedTelegramGame() {
  const game = createGame({
    title: "Production Bash",
    groomName: "Tincho",
    hostName: "Fede",
    telegramHandle: "@fede",
    startDate: "2026-03-25",
    endDate: "2026-03-27",
    accessMode: "telegram",
  });

  joinGame(game, { name: "Mauri", telegramHandle: "@mauri" });
  joinGame(game, { name: "Seba", telegramHandle: "@seba" });
  startGame(game);

  return {
    game,
    host: game.players.find((player) => player.id === game.hostPlayerId) as Player,
    mauri: game.players.find((player) => player.name === "Mauri") as Player,
    seba: game.players.find((player) => player.name === "Seba") as Player,
  };
}

export function submitPendingEvidence(game: Game, playerId: string, description = "Proof") {
  const quest = game.quests.find(
    (entry) => entry.playerId === playerId && entry.dayNumber === game.currentDay,
  );

  if (!quest) {
    throw new Error("Quest not found for test fixture.");
  }

  submitEvidence(game, playerId, quest.id, {
    description,
    kind: "photo",
    assetUrl: "https://example.com/proof.jpg",
  });

  return game.quests.find((entry) => entry.id === quest.id)!;
}
