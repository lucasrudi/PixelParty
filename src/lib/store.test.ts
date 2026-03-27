import { describe, expect, it } from "vitest";
import { createGame } from "@/lib/game-engine";
import { hydrateGame } from "@/lib/store";

describe("hydrateGame", () => {
  it("parses JSON string payloads from storage", () => {
    const createdGame = createGame({
      groomName: "Tincho",
      startDate: "2026-03-27",
      endDate: "2026-03-30",
      hostName: "Fede",
      telegramHandle: "@fede",
      accessMode: "telegram",
    });

    const game = hydrateGame(JSON.stringify(createdGame));

    expect(game.players).toHaveLength(1);
    expect(game.players[0]?.id).toBe(createdGame.hostPlayerId);
  });

  it("fills missing collection fields with safe defaults", () => {
    const game = hydrateGame({
      id: "game_123",
      inviteCode: "ABC123",
      title: "Weekend of Bad Decisions",
      groomName: "Tincho",
      startDate: "2026-03-27",
      endDate: "2026-03-30",
      totalDays: 4,
      accessMode: "telegram",
      status: "lobby",
      currentDay: 0,
      activeBeatId: "wheels-up",
      createdAt: "2026-03-27T00:00:00.000Z",
      updatedAt: "2026-03-27T00:00:00.000Z",
      hostPlayerId: "player_123",
    });

    expect(game.players).toEqual([]);
    expect(game.quests).toEqual([]);
    expect(game.messages).toEqual([]);
    expect(game.finaleCards).toEqual([]);
  });
});
