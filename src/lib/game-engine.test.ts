import { describe, expect, it } from "vitest";
import {
  createGame,
  joinGame,
  leaveGame,
  resetGame,
  validateQuest,
} from "@/lib/game-engine";
import {
  buildStartedSimulatorGame,
  buildStartedTelegramGame,
  submitPendingEvidence,
} from "@/test/fixtures";

describe("game validation flow", () => {
  it("allows a telegram game host with a verified Telegram user id and no handle", () => {
    const game = createGame({
      title: "Weekend of Bad Decisions",
      groomName: "Tincho",
      hostName: "Fede",
      startDate: "2026-03-27",
      endDate: "2026-03-30",
      accessMode: "telegram",
      telegramUserId: "123456789",
      telegramVerifiedAt: "2026-03-27T10:00:00.000Z",
    });

    expect(game.players[0]?.telegramUserId).toBe("123456789");
    expect(game.players[0]?.telegramHandle).toBe("");
  });

  it("blocks two players from joining with the same verified Telegram account", () => {
    const game = createGame({
      title: "Weekend of Bad Decisions",
      groomName: "Tincho",
      hostName: "Fede",
      telegramHandle: "@fede",
      startDate: "2026-03-27",
      endDate: "2026-03-30",
      accessMode: "telegram",
    });

    joinGame(game, {
      name: "Luqui",
      telegramUserId: "123456789",
    });

    expect(() =>
      joinGame(game, {
        name: "Seba",
        telegramUserId: "123456789",
      }),
    ).toThrow("Telegram account is already linked");
  });

  it("always includes the simulator host in the validator pool", () => {
    const { game, host, mauri } = buildStartedSimulatorGame();
    const quest = submitPendingEvidence(game, mauri.id, "Mauri proof");

    expect(quest.validators).toContain(host.id);
  });

  it("awards points and posts a narrator broadcast when evidence is accepted", () => {
    const { game, mauri, seba } = buildStartedSimulatorGame();
    const quest = submitPendingEvidence(game, mauri.id, "Mauri proof");

    const updatedGame = validateQuest(game, seba.id, quest.id, {
      decision: "approved",
      note: "Looks good",
    });

    const updatedQuest = updatedGame.quests.find((entry) => entry.id === quest.id);
    const approvalMessage = updatedGame.messages.at(-1);

    expect(updatedQuest?.status).toBe("completed");
    expect(updatedGame.players.find((player) => player.id === mauri.id)?.points).toBe(
      quest.points,
    );
    expect(approvalMessage?.audience).toBe("all");
    expect(approvalMessage?.body).toContain("approved");
  });

  it("does not award points and broadcasts the result when evidence is rejected", () => {
    const { game, mauri, seba } = buildStartedSimulatorGame();
    const quest = submitPendingEvidence(game, mauri.id, "Mauri proof");

    const updatedGame = validateQuest(game, seba.id, quest.id, {
      decision: "rejected",
      note: "Nope",
    });

    const updatedQuest = updatedGame.quests.find((entry) => entry.id === quest.id);
    const rejectionMessage = updatedGame.messages.at(-1);

    expect(updatedQuest?.status).toBe("rejected");
    expect(updatedGame.players.find((player) => player.id === mauri.id)?.points).toBe(0);
    expect(rejectionMessage?.audience).toBe("all");
    expect(rejectionMessage?.body).toContain("No points were awarded");
  });

  it("lets any other player validate a pending production proof", () => {
    const { game, mauri, seba } = buildStartedTelegramGame();
    const quest = submitPendingEvidence(game, mauri.id, "Mauri proof");

    quest.validators = [];

    const updatedGame = validateQuest(game, seba.id, quest.id, {
      decision: "approved",
      note: "Approved from the inbox",
    });

    expect(updatedGame.quests.find((entry) => entry.id === quest.id)?.status).toBe(
      "completed",
    );
  });

  it("blocks players from validating their own evidence", () => {
    const { game, mauri } = buildStartedSimulatorGame();
    const quest = submitPendingEvidence(game, mauri.id, "Mauri proof");

    expect(() =>
      validateQuest(game, mauri.id, quest.id, {
        decision: "approved",
        note: "Self-approved",
      }),
    ).toThrow("cannot validate your own quest");
  });

  it("lets a non-host player leave and removes their active progress", () => {
    const { game, mauri } = buildStartedTelegramGame();

    const updatedGame = leaveGame(game, mauri.id);

    expect(updatedGame.players.some((player) => player.id === mauri.id)).toBe(false);
    expect(updatedGame.quests.some((quest) => quest.playerId === mauri.id)).toBe(false);
    expect(updatedGame.messages.at(-1)?.title).toBe("Party member left");
  });

  it("blocks the host from leaving the game", () => {
    const { game, host } = buildStartedTelegramGame();

    expect(() => leaveGame(game, host.id)).toThrow(
      "The host cannot leave the game. Delete the game instead.",
    );
  });

  it("stores Telegram chat ids captured from Telegram WebApp", () => {
    const game = createGame({
      title: "Weekend of Bad Decisions",
      groomName: "Tincho",
      hostName: "Fede",
      telegramHandle: "@fede",
      telegramChatId: "1001",
      startDate: "2026-03-25",
      endDate: "2026-03-27",
      accessMode: "telegram",
    });

    const { player } = joinGame(game, {
      name: "Luqui",
      telegramHandle: "@luqui",
      telegramChatId: "2002",
    });

    expect(game.players.find((entry) => entry.id === game.hostPlayerId)?.telegramChatId).toBe(
      "1001",
    );
    expect(player.telegramChatId).toBe("2002");
  });

  it("resets a game back to the lobby while keeping the roster", () => {
    const { game, host, mauri, seba } = buildStartedSimulatorGame();

    submitPendingEvidence(game, mauri.id, "Mauri proof");
    game.players.find((player) => player.id === seba.id)!.points = 200;

    const reset = resetGame(game);

    expect(reset.status).toBe("lobby");
    expect(reset.currentDay).toBe(0);
    expect(reset.players.map((player) => player.id)).toEqual([host.id, mauri.id, seba.id]);
    expect(reset.players.every((player) => player.points === 0)).toBe(true);
    expect(reset.players.every((player) => player.activities.length === 0)).toBe(true);
    expect(reset.quests).toHaveLength(0);
    expect(reset.finaleCards).toHaveLength(0);
    expect(reset.messages).toHaveLength(1);
    expect(reset.messages[0]?.title).toBe("Lobby reset");
  });
});
