"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Game } from "@/lib/types";
import { readTelegramWebAppChatId } from "@/lib/telegram-webapp";
import styles from "./join-client.module.css";

const DEFAULT_PLAYER_NAME = "Luqui";

export function JoinClient({ game }: { game: Game }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleJoin(formData: FormData) {
    setError("");
    const telegramChatId = readTelegramWebAppChatId();

    const response = await fetch(`/api/games/${game.id}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: String(formData.get("name") ?? "").trim() || DEFAULT_PLAYER_NAME,
        telegramHandle: String(formData.get("telegramHandle") ?? ""),
        ...(telegramChatId ? { telegramChatId } : {}),
      }),
    });

    const data = (await response.json()) as { error?: string; playerId?: string };

    if (!response.ok || !data.playerId) {
      setError(data.error ?? "Could not join this game.");
      return;
    }

    router.push(`/game/${game.id}?player=${data.playerId}`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <p className={styles.eyebrow}>Public Invite Lobby</p>
        <h1>{game.title}</h1>
        <p className={styles.meta}>
          Trip window: {game.startDate} to {game.endDate} · {game.players.length} player
          {game.players.length === 1 ? "" : "s"} already in the lobby
        </p>
        <p className={styles.summary}>
          The narrator will welcome the crew on day one, send a side quest to each player every day, and crown the final legend when the trip ends.
        </p>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              await handleJoin(new FormData(event.currentTarget));
            });
          }}
        >
          <label>
            Your name
            <input name="name" placeholder={DEFAULT_PLAYER_NAME} />
          </label>
          {game.accessMode === "telegram" ? (
            <label>
              Telegram handle
              <input name="telegramHandle" placeholder="@luqui" required />
            </label>
          ) : null}
          {error ? <p className={styles.error}>{error}</p> : null}
          <button type="submit" disabled={isPending || game.status !== "lobby"}>
            {game.status === "lobby"
              ? isPending
                ? "Joining..."
                : "Join The Party"
              : "Lobby Closed"}
          </button>
        </form>
      </div>
    </div>
  );
}
