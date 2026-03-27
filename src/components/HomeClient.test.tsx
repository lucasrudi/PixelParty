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
});
