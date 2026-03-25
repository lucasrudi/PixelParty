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
});
