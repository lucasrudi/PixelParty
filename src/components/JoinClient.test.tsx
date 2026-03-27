import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { JoinClient } from "@/components/JoinClient";
import { createGame } from "@/lib/game-engine";
import { mockRouter } from "@/test/setup";

describe("JoinClient", () => {
  it("joins a lobby game and routes the player into the game", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ playerId: "player_joined" })),
    );
    const game = createGame({
      title: "Weekend of Bad Decisions",
      groomName: "Tincho",
      hostName: "Fede",
      telegramHandle: "@fede",
      startDate: "2026-03-27",
      endDate: "2026-03-30",
      accessMode: "telegram",
    });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <JoinClient
        game={game}
        telegramAuth={null}
        telegramLoginEnabled={false}
      />,
    );

    await user.type(screen.getByLabelText(/your name/i), "Luqui");
    await user.type(screen.getByLabelText(/telegram handle/i), "@luqui");
    await user.click(screen.getByRole("button", { name: /join the party/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        `/api/games/${game.id}/join`,
        expect.objectContaining({
          method: "POST",
        }),
      );
    });

    const [, request] = fetchMock.mock.calls[0] ?? [];
    const payload = JSON.parse(String(request?.body ?? "{}")) as Record<string, string>;

    expect(payload.name).toBe("Luqui");
    expect(payload.telegramHandle).toBe("@luqui");

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith(
        `/game/${game.id}?player=player_joined`,
      );
    });
  });

  it("uses the verified Telegram username when available", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ playerId: "player_joined" })),
    );
    const game = createGame({
      title: "Weekend of Bad Decisions",
      groomName: "Tincho",
      hostName: "Fede",
      telegramHandle: "@fede",
      startDate: "2026-03-27",
      endDate: "2026-03-30",
      accessMode: "telegram",
    });

    vi.stubGlobal("fetch", fetchMock);

    render(
      <JoinClient
        game={game}
        telegramAuth={{
          authDate: 1_700_000_000,
          id: "987654321",
          name: "Luqui",
          username: "luqui",
          verifiedAt: "2026-03-27T10:00:00.000Z",
        }}
        telegramLoginEnabled
      />,
    );

    await user.type(screen.getByLabelText(/your name/i), "Luqui");
    await user.click(screen.getByRole("button", { name: /join the party/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const [, request] = fetchMock.mock.calls[0] ?? [];
    const payload = JSON.parse(String(request?.body ?? "{}")) as Record<string, string>;

    expect(payload.telegramHandle).toBe("@luqui");
  });
});
