"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { TelegramAuthSession } from "@/lib/telegram-auth";
import { readTelegramWebAppChatId } from "@/lib/telegram-webapp";
import type { Game } from "@/lib/types";
import styles from "./join-client.module.css";

const DEFAULT_PLAYER_NAME = "Luqui";

export function JoinClient({
  game,
  telegramAuth,
  telegramLoginEnabled,
}: {
  game: Game;
  telegramAuth: TelegramAuthSession | null;
  telegramLoginEnabled: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const linkedHandle = telegramAuth?.username ? `@${telegramAuth.username}` : "";
  const telegramAuthError = searchParams.get("telegramAuthError") ?? "";

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
        telegramHandle:
          String(formData.get("telegramHandle") ?? "").trim() || linkedHandle,
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
          {game.accessMode === "telegram" && telegramLoginEnabled ? (
            <div className={styles.identityCard}>
              <strong>
                {telegramAuth ? "Telegram account linked" : "Link Telegram first"}
              </strong>
              <p>
                {telegramAuth
                  ? `Signed in as ${linkedHandle || telegramAuth.name}. This verified Telegram account will be attached to your player when you join.`
                  : "Sign in with Telegram here to attach a verified Telegram identity and request bot DM access before you enter the lobby."}
              </p>
              <a
                href={
                  telegramAuth
                    ? `/api/telegram/logout?returnTo=${encodeURIComponent(`/join/${game.inviteCode}`)}`
                    : `/api/telegram/login?returnTo=${encodeURIComponent(`/join/${game.inviteCode}`)}`
                }
                className={styles.identityAction}
              >
                {telegramAuth ? "Switch Telegram Account" : "Continue With Telegram"}
              </a>
              {telegramAuthError ? <p className={styles.error}>{telegramAuthError}</p> : null}
            </div>
          ) : null}
          <label>
            Your name
            <input name="name" placeholder={DEFAULT_PLAYER_NAME} />
          </label>
          {game.accessMode === "telegram" ? (
            <label>
              Telegram handle
              <input
                name="telegramHandle"
                placeholder="@luqui"
                defaultValue={linkedHandle}
                readOnly={Boolean(linkedHandle)}
                required={!telegramAuth}
              />
            </label>
          ) : null}
          {game.accessMode === "telegram" && telegramAuth && !linkedHandle ? (
            <p className={styles.fieldHint}>
              Telegram is linked already. Add a public `@username` only if you want it shown in
              the roster.
            </p>
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
