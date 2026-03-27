import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GameClient } from "@/components/GameClient";
import { createGame, joinGame, startGame } from "@/lib/game-engine";
import { mockRouter } from "@/test/setup";

function buildLobbyGame() {
  const game = createGame({
    title: "Host Controls",
    groomName: "Tincho",
    hostName: "Fede",
    telegramHandle: "@fede",
    startDate: "2026-03-27",
    endDate: "2026-03-30",
    accessMode: "telegram",
  });

  joinGame(game, { name: "Mauri", telegramHandle: "@mauri" });
  joinGame(game, { name: "Seba", telegramHandle: "@seba" });

  return game;
}

describe("GameClient host controls", () => {
  it("starts a lobby game from the host controls", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true })));
    const game = buildLobbyGame();
    const host = game.players.find((player) => player.id === game.hostPlayerId)!;

    vi.stubGlobal("fetch", fetchMock);

    render(<GameClient game={game} currentPlayer={host} />);

    await user.click(screen.getByRole("button", { name: /start game and trigger day 1/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/games/${game.id}/start`,
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    expect(mockRouter.refresh).toHaveBeenCalled();
  });

  it("advances the day and can end the game early for the host", async () => {
    const user = userEvent.setup();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true })));
    const game = buildLobbyGame();
    const host = game.players.find((player) => player.id === game.hostPlayerId)!;

    startGame(game);
    vi.stubGlobal("fetch", fetchMock);

    render(<GameClient game={game} currentPlayer={host} />);

    await user.click(screen.getByRole("button", { name: /advance to next day/i }));
    await user.click(screen.getByRole("button", { name: /end game now/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        `/api/games/${game.id}/days/next`,
        expect.objectContaining({
          method: "POST",
        }),
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        `/api/games/${game.id}/finish`,
        expect.objectContaining({
          method: "POST",
        }),
      );
    });
  });

  it("copies the public invite link", async () => {
    const user = userEvent.setup();
    const game = buildLobbyGame();
    const host = game.players.find((player) => player.id === game.hostPlayerId)!;
    const writeTextMock = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();

    render(<GameClient game={game} currentPlayer={host} />);

    await user.click(screen.getByRole("button", { name: /copy invite link/i }));

    expect(writeTextMock).toHaveBeenCalledWith(
      `${window.location.origin}/join/${game.inviteCode}`,
    );
    expect(screen.getByText(/invite copied/i)).toBeInTheDocument();
  });
});
