"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Game } from "@/lib/types";
import styles from "./simulator-client.module.css";

const SIMULATOR_NAMES = [
  "Mauri",
  "Seba",
  "Flor",
  "Luqui",
  "Javi",
  "Fer",
  "Nacho",
  "Santi",
  "Coco",
  "Pepo",
  "Toto",
  "Bauti",
];

function offsetDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextSimulatorPlayerName(existingNames: string[]) {
  const usedNames = new Set(existingNames.map((name) => name.toLowerCase()));
  const availableNames = SIMULATOR_NAMES.filter(
    (name) => !usedNames.has(name.toLowerCase()),
  );

  if (availableNames.length > 0) {
    return availableNames[Math.floor(Math.random() * availableNames.length)];
  }

  let suffix = existingNames.length + 1;
  while (usedNames.has(`party crasher ${suffix}`)) {
    suffix += 1;
  }

  return `Party Crasher ${suffix}`;
}

export function SimulatorClient({ games }: { games: Game[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const simulatorGames = games.filter((game) => game.accessMode === "simulator");

  async function createSim(formData: FormData) {
    const response = await fetch("/api/games", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        groomName: String(formData.get("groomName") ?? ""),
        hostName: String(formData.get("hostName") ?? ""),
        startDate: String(formData.get("startDate") ?? ""),
        endDate: String(formData.get("endDate") ?? ""),
        title: String(formData.get("title") ?? ""),
        accessMode: "simulator",
      }),
    });

    const data = (await response.json()) as {
      error?: string;
      gameId?: string;
      hostPlayerId?: string;
    };

    if (!response.ok || !data.gameId || !data.hostPlayerId) {
      setError(data.error ?? "Could not create simulator.");
      return;
    }

    router.push(`/game/${data.gameId}?player=${data.hostPlayerId}`);
  }

  async function joinSim(gameId: string, formData: FormData) {
    const response = await fetch(`/api/games/${gameId}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: String(formData.get("name") ?? ""),
      }),
    });

    const data = (await response.json()) as { error?: string; playerId?: string };

    if (!response.ok || !data.playerId) {
      setError(data.error ?? "Could not join the simulator game.");
      return;
    }

    router.push(`/game/${gameId}?player=${data.playerId}`);
  }

  async function addRandomPlayer(gameId: string, existingNames: string[]) {
    const response = await fetch(`/api/games/${gameId}/join`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: nextSimulatorPlayerName(existingNames),
      }),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Could not add a random simulator user.");
      return;
    }

    router.refresh();
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>Local Simulator</p>
        <h1>Spin up a test game, log in with names only, and rehearse the whole bachelor-party loop locally.</h1>
        <p>
          This page uses the same persistence and game engine as the main web flow, but removes Telegram requirements so you can simulate joining, starting the trip, advancing days, submitting updates, validating quests, and ending the game on your machine.
        </p>
      </section>

      <section className={styles.grid}>
        <form
          className={styles.createCard}
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              await createSim(new FormData(event.currentTarget));
            });
          }}
        >
          <h2>New simulator game</h2>
          <label>
            Optional title
            <input name="title" placeholder="Weekend of Bad Decisions" />
          </label>
          <label>
            Groom name
            <input name="groomName" placeholder="Tincho" required />
          </label>
          <label>
            Host name
            <input name="hostName" placeholder="Fede" required />
          </label>
          <div className={styles.dateRow}>
            <label>
              Start date
              <input name="startDate" type="date" defaultValue={offsetDate(0)} required />
            </label>
            <label>
              End date
              <input name="endDate" type="date" defaultValue={offsetDate(2)} required />
            </label>
          </div>
          {error ? <p className={styles.error}>{error}</p> : null}
          <button type="submit" disabled={isPending}>
            {isPending ? "Creating..." : "Create simulator game"}
          </button>
        </form>

        <div className={styles.list}>
          {simulatorGames.length === 0 ? (
            <div className={styles.empty}>
              <strong>No simulator games yet.</strong>
              <p>Create one on the left, then use the generated player links to test the full flow.</p>
            </div>
          ) : null}
          {simulatorGames.map((game) => (
            <article key={game.id} className={styles.gameCard}>
              <div>
                <span className={styles.status}>{game.status}</span>
                <h2>{game.title}</h2>
                <p>
                  {game.players.length} players · Day {game.currentDay || 0} of {game.totalDays}
                </p>
              </div>
              <div className={styles.cardActions}>
                <Link href={`/game/${game.id}?player=${game.hostPlayerId}`}>
                  Open host dashboard
                </Link>
                <Link href={`/join/${game.inviteCode}`}>Open invite page</Link>
                <button
                  type="button"
                  disabled={isPending || game.status !== "lobby"}
                  onClick={() =>
                    startTransition(async () => {
                      await addRandomPlayer(
                        game.id,
                        game.players.map((player) => player.name),
                      );
                    })
                  }
                >
                  Add random user
                </button>
              </div>
              <form
                className={styles.joinInline}
                onSubmit={(event) => {
                  event.preventDefault();
                  startTransition(async () => {
                    await joinSim(game.id, new FormData(event.currentTarget));
                  });
                }}
              >
                <input name="name" placeholder="Join as Mauri" required />
                <button type="submit" disabled={isPending || game.status !== "lobby"}>
                  Quick join
                </button>
              </form>
              <div className={styles.playerLinks}>
                {game.players.map((player) => (
                  <Link key={player.id} href={`/game/${game.id}?player=${player.id}`}>
                    {player.name}
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
