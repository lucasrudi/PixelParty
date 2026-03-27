import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { GameClient } from "@/components/GameClient";
import {
  buildStartedTelegramGame,
  submitPendingEvidence,
} from "@/test/fixtures";

describe("GameClient validation inbox", () => {
  it("shows a pending-review badge count for evidence from other players", async () => {
    const user = userEvent.setup();
    const { game, seba, mauri } = buildStartedTelegramGame();

    submitPendingEvidence(game, mauri.id, "Mauri proof");
    submitPendingEvidence(game, seba.id, "Seba proof");

    render(<GameClient game={game} currentPlayer={seba} />);

    const inboxButton = screen.getByRole("button", { name: /validation inbox/i });

    expect(within(inboxButton).getByText("1")).toBeInTheDocument();

    await user.click(inboxButton);

    const inboxHeading = screen.getByRole("heading", { name: "Validation inbox" });
    const inbox = inboxHeading.closest("section");

    expect(inbox).not.toBeNull();
    expect(within(inbox!).getAllByText("Mauri proof").length).toBeGreaterThan(0);
    expect(within(inbox!).queryByText("Seba proof")).not.toBeInTheDocument();
  });

  it("opens an empty inbox state when there are no pending validations", async () => {
    const user = userEvent.setup();
    const { game, seba } = buildStartedTelegramGame();

    render(<GameClient game={game} currentPlayer={seba} />);

    const inboxButton = screen.getByRole("button", { name: /validation inbox/i });

    expect(within(inboxButton).getByText("0")).toBeInTheDocument();

    await user.click(inboxButton);

    expect(
      screen.getByText("No pending evidence from other players right now."),
    ).toBeInTheDocument();
  });

  it("shows the Telegram bind link for an unbound player in telegram games", () => {
    const { game, seba } = buildStartedTelegramGame();

    render(
      <GameClient
        game={game}
        currentPlayer={seba}
        telegramBinding={{
          isBound: false,
          bindUrl: "https://t.me/pixelparty_bot?start=bind_player-token",
        }}
      />,
    );

    expect(
      screen.getByRole("heading", { name: /seba's dashboard/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Connect your Telegram account")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /bind this player in telegram/i }),
    ).toHaveAttribute(
      "href",
      "https://t.me/pixelparty_bot?start=bind_player-token",
    );
  });

  it("shows the connected Telegram state for a bound player", () => {
    const { game, seba } = buildStartedTelegramGame();

    render(
      <GameClient
        game={game}
        currentPlayer={seba}
        telegramBinding={{
          isBound: true,
          bindUrl: null,
          boundAt: "2026-03-28T12:00:00.000Z",
        }}
      />,
    );

    expect(screen.getByText("Telegram connected")).toBeInTheDocument();
    expect(
      screen.getByText(/this player is linked for telegram delivery/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /bind this player in telegram/i }),
    ).not.toBeInTheDocument();
  });
});
