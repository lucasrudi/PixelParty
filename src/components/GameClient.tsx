"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { listStoryBeats } from "@/lib/story";
import { Game, Player, Quest } from "@/lib/types";
import styles from "./game-client.module.css";

function formatStatus(status: Quest["status"]) {
  return status.replaceAll("_", " ");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function playerQuestForDay(game: Game, playerId: string, dayNumber: number) {
  return game.quests.find(
    (quest) => quest.playerId === playerId && quest.dayNumber === dayNumber,
  );
}

function recentMessages(game: Game, currentPlayer?: Player) {
  return [...game.messages]
    .filter(
      (message) =>
        message.audience === "all" || message.playerId === currentPlayer?.id,
    )
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 12);
}

export function GameClient({
  game,
  currentPlayer,
}: {
  game: Game;
  currentPlayer?: Player;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [copyState, setCopyState] = useState("");
  const [isPending, startTransition] = useTransition();

  const journey = listStoryBeats(game.totalDays);
  const visibleMessages = recentMessages(game, currentPlayer);
  const todayQuest = currentPlayer
    ? playerQuestForDay(game, currentPlayer.id, game.currentDay)
    : undefined;
  const questHistory = currentPlayer
    ? [...game.quests]
        .filter((quest) => quest.playerId === currentPlayer.id)
        .sort((left, right) => right.dayNumber - left.dayNumber)
        .slice(0, 4)
    : [];
  const pendingValidations = currentPlayer
    ? game.quests.filter(
        (quest) =>
          quest.status === "pending_validation" &&
          quest.validators.includes(currentPlayer.id) &&
          !quest.validationVotes.some((vote) => vote.playerId === currentPlayer.id),
      )
    : [];
  const activeBeat =
    journey[Math.max(game.currentDay - 1, 0)] ?? journey[journey.length - 1];
  const isHost = currentPlayer?.id === game.hostPlayerId;

  async function runJsonAction(
    url: string,
    body?: Record<string, string>,
  ) {
    setError("");

    const response = await fetch(url, {
      method: "POST",
      headers: body
        ? {
            "Content-Type": "application/json",
          }
        : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Something went wrong.");
      return;
    }

    router.refresh();
  }

  async function handleCopyInvite() {
    const inviteUrl = `${window.location.origin}/join/${game.inviteCode}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopyState("Invite copied");
    window.setTimeout(() => setCopyState(""), 2000);
  }

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroImageWrap}>
          <Image
            src={activeBeat.backdrop}
            alt={activeBeat.label}
            fill
            className={styles.heroImage}
            sizes="100vw"
            priority
          />
          <div className={styles.heroShade} />
        </div>
        <div className={styles.heroContent}>
          <div className={styles.heroTopline}>
            <span>{game.status === "lobby" ? "Lobby open" : `Day ${game.currentDay} of ${game.totalDays}`}</span>
            <span>{activeBeat.location}</span>
          </div>
          <h1>{game.title}</h1>
          <p>{activeBeat.narratorLead}</p>
          <div className={styles.heroActions}>
            <button type="button" onClick={() => void handleCopyInvite()}>
              Copy invite link
            </button>
            <Link href={`/join/${game.inviteCode}`}>Public join page</Link>
            {copyState ? <span className={styles.copyState}>{copyState}</span> : null}
          </div>
          <div className={styles.heroMeta}>
            <span>Groom: {game.groomName}</span>
            <span>{formatDate(game.startDate)} to {formatDate(game.endDate)}</span>
            <span>{game.accessMode === "telegram" ? "Telegram-ready flow" : "Simulator mode"}</span>
          </div>
        </div>
      </header>

      <main className={styles.layout}>
        <section className={styles.leftRail}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Trip map</h2>
              <span>{game.totalDays} stops</span>
            </div>
            <div className={styles.mapTimeline}>
              {journey.map((beat, index) => {
                const isActive =
                  game.status === "finished"
                    ? index === journey.length - 1
                    : index === Math.max(game.currentDay - 1, 0);

                return (
                  <div
                    key={`${beat.id}-${index}`}
                    className={`${styles.stop} ${isActive ? styles.stopActive : ""}`}
                  >
                    <div className={styles.stopIndex}>{index + 1}</div>
                    <div>
                      <strong>{beat.label}</strong>
                      <p>{beat.location}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>

          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Roster</h2>
              <span>{game.players.length} players</span>
            </div>
            <div className={styles.roster}>
              {[...game.players]
                .sort((left, right) => right.points - left.points)
                .map((player) => {
                  const currentDayQuest = playerQuestForDay(
                    game,
                    player.id,
                    Math.max(game.currentDay, 1),
                  );

                  return (
                    <div key={player.id} className={styles.playerCard}>
                      <Image
                        src={`/pixelforge/portraits/${player.avatarKey}.png`}
                        alt={player.name}
                        width={56}
                        height={56}
                        className={styles.portrait}
                      />
                      <div className={styles.playerMeta}>
                        <strong>{player.name}</strong>
                        <span>{player.roleTitle}</span>
                        <span>{player.points} pts</span>
                        <span>
                          {currentDayQuest
                            ? `Quest: ${formatStatus(currentDayQuest.status)}`
                            : "Quest pending"}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </article>

          {isHost ? (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Host controls</h2>
                <span>Simulation-safe</span>
              </div>
              <div className={styles.buttonColumn}>
                {game.status === "lobby" ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await runJsonAction(`/api/games/${game.id}/start`);
                      })
                    }
                  >
                    Start game and trigger day 1
                  </button>
                ) : null}
                {game.status === "active" ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await runJsonAction(`/api/games/${game.id}/days/next`);
                      })
                    }
                  >
                    {game.currentDay >= game.totalDays ? "Trigger finale" : "Advance to next day"}
                  </button>
                ) : null}
                {game.status !== "finished" ? (
                  <button
                    type="button"
                    className={styles.ghostButton}
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await runJsonAction(`/api/games/${game.id}/finish`);
                      })
                    }
                  >
                    End game now
                  </button>
                ) : null}
              </div>
            </article>
          ) : null}
        </section>

        <section className={styles.centerRail}>
          {currentPlayer ? (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>{`${currentPlayer.name}'s dashboard`}</h2>
                <span>
                  {currentPlayer.telegramHandle || "Simulator identity"} · {currentPlayer.points} pts
                </span>
              </div>
              {game.status === "active" ? (
                <form
                  className={styles.form}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);

                    startTransition(async () => {
                      await runJsonAction(
                        `/api/games/${game.id}/players/${currentPlayer.id}/activity`,
                        {
                          summary: String(formData.get("summary") ?? ""),
                        },
                      );
                    });
                  }}
                >
                  <label>
                    What are you doing today?
                    <textarea
                      name="summary"
                      rows={4}
                      defaultValue={
                        currentPlayer.activities.find(
                          (activity) => activity.dayNumber === game.currentDay,
                        )?.summary ?? ""
                      }
                      placeholder="Tell the narrator what’s going on: who you met, what chaos you caused, or how you kept the crew alive."
                    />
                  </label>
                  <button type="submit" disabled={isPending}>
                    Send daily update
                  </button>
                </form>
              ) : (
                <p className={styles.emptyState}>
                  {game.status === "lobby"
                    ? "The narrator is waiting for the host to start the trip."
                    : "The trip is over. Scroll down for the legend board."}
                </p>
              )}
            </article>
          ) : (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Choose a player view</h2>
                <span>Open with ?player=PLAYER_ID</span>
              </div>
              <div className={styles.buttonColumn}>
                {game.players.map((player) => (
                  <Link key={player.id} href={`/game/${game.id}?player=${player.id}`}>
                    {`Open ${player.name}'s dashboard`}
                  </Link>
                ))}
              </div>
            </article>
          )}

          {todayQuest && currentPlayer ? (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Today&apos;s quest</h2>
                <span>{todayQuest.points} pts</span>
              </div>
              <div className={styles.questHero}>
                <strong>{todayQuest.title}</strong>
                <span className={styles.questStatus}>{formatStatus(todayQuest.status)}</span>
              </div>
              <p>{todayQuest.brief}</p>
              <p className={styles.evidencePrompt}>Evidence brief: {todayQuest.evidencePrompt}</p>
              {game.status === "active" ? (
                <form
                  className={styles.form}
                  onSubmit={(event) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);

                    formData.set("playerId", currentPlayer.id);

                    startTransition(async () => {
                      setError("");
                      const response = await fetch(
                        `/api/games/${game.id}/quests/${todayQuest.id}/evidence`,
                        {
                          method: "POST",
                          body: formData,
                        },
                      );
                      const data = (await response.json()) as { error?: string };

                      if (!response.ok) {
                        setError(data.error ?? "Could not submit evidence.");
                        return;
                      }

                      router.refresh();
                    });
                  }}
                >
                  <label>
                    Proof type
                    <select name="kind" defaultValue={todayQuest.evidence?.kind ?? "photo"}>
                      <option value="photo">Photo</option>
                      <option value="video">Video</option>
                    </select>
                  </label>
                  <label>
                    Evidence summary
                    <input
                      name="description"
                      defaultValue={todayQuest.evidence?.description ?? ""}
                      placeholder="What are validators looking at?"
                      required
                    />
                  </label>
                  <label>
                    Upload a file
                    <input name="file" type="file" accept="image/*,video/*" />
                  </label>
                  <label>
                    Or use a proof URL / simulator placeholder
                    <input
                      name="proofUrl"
                      defaultValue={todayQuest.evidence?.assetUrl ?? ""}
                      placeholder="https://... or simulator://proof"
                    />
                  </label>
                  <button type="submit" disabled={isPending}>
                    Submit evidence for validation
                  </button>
                </form>
              ) : null}
              {todayQuest.evidence ? (
                <div className={styles.evidenceCard}>
                  <span>{todayQuest.evidence.kind.toUpperCase()}</span>
                  <p>{todayQuest.evidence.description}</p>
                  {todayQuest.evidence.kind === "video" &&
                  /^\/|^https?:\/\//.test(todayQuest.evidence.assetUrl) ? (
                    <video src={todayQuest.evidence.assetUrl} controls className={styles.media} />
                  ) : todayQuest.evidence.assetUrl.startsWith("/") ? (
                    <Image
                      src={todayQuest.evidence.assetUrl}
                      alt={todayQuest.evidence.description}
                      width={480}
                      height={280}
                      className={styles.media}
                    />
                  ) : (
                    <a href={todayQuest.evidence.assetUrl} target="_blank" rel="noreferrer">
                      Open evidence
                    </a>
                  )}
                </div>
              ) : null}
            </article>
          ) : null}

          {pendingValidations.length > 0 && currentPlayer ? (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Validation duty</h2>
                <span>{pendingValidations.length} quests waiting</span>
              </div>
              <div className={styles.validationList}>
                {pendingValidations.map((quest) => {
                  const owner = game.players.find((player) => player.id === quest.playerId);

                  return (
                    <form
                      key={quest.id}
                      className={styles.validationCard}
                      onSubmit={(event) => {
                        event.preventDefault();
                        const formData = new FormData(event.currentTarget);

                        startTransition(async () => {
                          await runJsonAction(
                            `/api/games/${game.id}/quests/${quest.id}/validate`,
                            {
                              playerId: currentPlayer.id,
                              decision: String(formData.get("decision") ?? "approved"),
                              note: String(formData.get("note") ?? ""),
                            },
                          );
                        });
                      }}
                    >
                      <div>
                        <strong>{owner?.name}</strong>
                        <p>{quest.title}</p>
                        <span>{quest.evidence?.description}</span>
                      </div>
                      <label>
                        Validator note
                        <input
                          name="note"
                          placeholder="Looks legit / needs a better angle"
                        />
                      </label>
                      <div className={styles.validationButtons}>
                        <button type="submit" name="decision" value="approved">
                          Approve
                        </button>
                        <button
                          type="submit"
                          name="decision"
                          value="rejected"
                          className={styles.ghostButton}
                        >
                          Reject
                        </button>
                      </div>
                    </form>
                  );
                })}
              </div>
            </article>
          ) : null}

          {questHistory.length > 0 ? (
            <article className={styles.panel}>
              <div className={styles.panelHeader}>
                <h2>Quest history</h2>
                <span>Recent receipts</span>
              </div>
              <div className={styles.historyList}>
                {questHistory.map((quest) => (
                  <div key={quest.id} className={styles.historyCard}>
                    <strong>{quest.title}</strong>
                    <span>
                      Day {quest.dayNumber} · {quest.points} pts · {formatStatus(quest.status)}
                    </span>
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          {game.status === "finished" ? (
            <article className={styles.finale}>
              <div className={styles.panelHeader}>
                <h2>Legend board</h2>
                <span>Trip complete</span>
              </div>
              <div className={styles.podium}>
                {[...game.players]
                  .sort((left, right) => right.points - left.points)
                  .map((player, index) => (
                    <div key={player.id} className={styles.podiumCard}>
                      <span>{`#${index + 1}`}</span>
                      <strong>{player.name}</strong>
                      <p>{player.points} points</p>
                    </div>
                  ))}
              </div>
              <div className={styles.finaleCards}>
                {game.finaleCards.map((card) => {
                  const owner = game.players.find((player) => player.id === card.playerId);
                  return (
                    <div key={card.playerId} className={styles.finaleCard}>
                      <Image
                        src={`/pixelforge/portraits/${owner?.avatarKey ?? "tincho"}.png`}
                        alt={owner?.name ?? card.title}
                        width={56}
                        height={56}
                        className={styles.portrait}
                      />
                      <div>
                        <strong>{card.title}</strong>
                        <p>{card.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </article>
          ) : null}
        </section>

        <section className={styles.rightRail}>
          <article className={styles.panel}>
            <div className={styles.panelHeader}>
              <h2>Narrator feed</h2>
              <span>{game.accessMode === "telegram" ? "Telegram-ready outbox" : "Simulator feed"}</span>
            </div>
            <div className={styles.feed}>
              {visibleMessages.map((message) => (
                <div key={message.id} className={styles.feedItem}>
                  <div>
                    <strong>{message.title}</strong>
                    <span>{message.channel}</span>
                  </div>
                  <p>{message.body}</p>
                </div>
              ))}
            </div>
          </article>

          {error ? (
            <article className={styles.errorPanel}>
              <strong>Action blocked</strong>
              <p>{error}</p>
            </article>
          ) : null}
        </section>
      </main>
    </div>
  );
}
