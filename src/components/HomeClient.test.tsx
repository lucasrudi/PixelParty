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

    render(<HomeClient showSimulatorLink />);

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

  it("includes the Telegram WebApp chat id when available", async () => {
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
    Object.assign(window, {
      Telegram: {
        WebApp: {
          initDataUnsafe: {
            user: {
              id: 1001,
            },
          },
        },
      },
    });

    render(<HomeClient showSimulatorLink />);

    await user.type(screen.getByLabelText(/host telegram/i), "@fede");
    await user.click(
      screen.getByRole("button", { name: /create telegram-ready game/i }),
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const [, request] = fetchMock.mock.calls[0] ?? [];
    const payload = JSON.parse(String(request?.body ?? "{}")) as Record<string, string>;

    expect(payload.telegramChatId).toBe("1001");
  });

  it("renders the Telegram bot link when a username is configured", () => {
    render(
      <HomeClient
        showSimulatorLink={false}
        telegramBotUrl="https://t.me/pixel_party_bot"
        telegramBotUsername="pixel_party_bot"
      />,
    );

    expect(
      screen.getByRole("link", { name: /open telegram bot/i }),
    ).toHaveAttribute("href", "https://t.me/pixel_party_bot");
    expect(screen.getByText(/current bot: @pixel_party_bot/i)).toBeInTheDocument();
  });

  it("looks up joined games by telegram handle and resumes the selected run", async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          games: [
            {
              accessMode: "telegram",
              currentDay: 2,
              endDate: "2026-03-30",
              gameId: "game_456",
              hostName: "Fede",
              joinedAt: "2026-03-27T00:00:00.000Z",
              playerId: "player_456",
              playerName: "Seba",
              startDate: "2026-03-27",
              status: "active",
              title: "Weekend of Bad Decisions",
              totalDays: 4,
              updatedAt: "2026-03-28T00:00:00.000Z",
            },
          ],
        }),
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    render(<HomeClient showSimulatorLink />);

    await user.type(screen.getByRole("textbox", { name: /^telegram handle$/i }), "@seba");
    await user.click(screen.getByRole("button", { name: /find my games/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/games?telegramHandle=%40seba");
    });

    expect(screen.getByText("Weekend of Bad Decisions")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /resume play/i }));

    expect(mockRouter.push).toHaveBeenCalledWith("/game/game_456?player=player_456");
  });
});
