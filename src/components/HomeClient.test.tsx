import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HomeClient } from "@/components/HomeClient";
import { mockRouter } from "@/test/setup";

describe("HomeClient", () => {
  it("creates a telegram game and routes to the host dashboard", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          gameId: "game_123",
          hostPlayerId: "player_123",
        }),
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    render(
      <HomeClient
        showSimulatorLink
        telegramAuth={null}
        telegramLoginEnabled={false}
      />,
    );

    await user.type(screen.getByLabelText(/host telegram/i), "@fede");
    await user.click(
      screen.getByRole("button", { name: /create telegram-ready game/i }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/games",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }),
      );
    });

    const [, request] = fetchMock.mock.calls[0] ?? [];
    const payload = JSON.parse(String(request?.body ?? "{}")) as Record<string, string>;

    expect(payload.accessMode).toBe("telegram");
    expect(payload.telegramHandle).toBe("@fede");

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith("/game/game_123?player=player_123");
    });
  });

  it("uses the verified Telegram username when the account is linked", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          gameId: "game_123",
          hostPlayerId: "player_123",
        }),
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    render(
      <HomeClient
        showSimulatorLink={false}
        telegramAuth={{
          authDate: 1_700_000_000,
          id: "123456789",
          name: "Fede",
          username: "fede",
          verifiedAt: "2026-03-27T10:00:00.000Z",
        }}
        telegramLoginEnabled
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /create telegram-ready game/i }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const [, request] = fetchMock.mock.calls[0] ?? [];
    const payload = JSON.parse(String(request?.body ?? "{}")) as Record<string, string>;

    expect(payload.telegramHandle).toBe("@fede");
  });
});
