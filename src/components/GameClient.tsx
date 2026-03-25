"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { listStoryBeats } from "@/lib/story";
import { Game, Player, Quest } from "@/lib/types";
import styles from "./game-client.module.css";

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

function questHistoryForPlayer(game: Game, playerId: string) {
  return [...game.quests]
    .filter((quest) => quest.playerId === playerId)
    .sort((left, right) => right.dayNumber - left.dayNumber)
    .slice(0, 4);
}

function pendingValidationsForPlayer(game: Game, playerId: string) {
  return game.quests.filter(
    (quest) =>
      quest.status === "pending_validation" &&
      quest.playerId !== playerId &&
      !quest.validationVotes.some((vote) => vote.playerId === playerId),
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

function nextSimulatorPlayerName(players: Player[]) {
  const usedNames = new Set(players.map((player) => player.name.toLowerCase()));
  const availableNames = SIMULATOR_NAMES.filter(
    (name) => !usedNames.has(name.toLowerCase()),
  );

  if (availableNames.length > 0) {
    return availableNames[Math.floor(Math.random() * availableNames.length)];
  }

  let suffix = players.length + 1;
  while (usedNames.has(`party crasher ${suffix}`)) {
    suffix += 1;
  }

  return `Party Crasher ${suffix}`;
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
  const [openValidationMenus, setOpenValidationMenus] = useState<
    Record<string, boolean>
  >({});
  const [isPending, startTransition] = useTransition();

  const journey = listStoryBeats(game.totalDays);
  const hostPlayer = game.players.find((player) => player.id === game.hostPlayerId);
  const visibleMessages = recentMessages(game, currentPlayer);
  const todayQuest = currentPlayer
    ? playerQuestForDay(game, currentPlayer.id, game.currentDay)
    : undefined;
  const questHistory = currentPlayer
    ? questHistoryForPlayer(game, currentPlayer.id)
    : [];
  const pendingValidations = currentPlayer
    ? pendingValidationsForPlayer(game, currentPlayer.id)
    : [];
  const activeBeat =
    journey[Math.max(game.currentDay - 1, 0)] ?? journey[journey.length - 1];
  const isHost = currentPlayer?.id === game.hostPlayerId;
  const canManageGame = isHost || game.accessMode === "simulator";
  const showSimulatorSplitView =
    game.accessMode === "simulator" &&
    game.status === "active" &&
    game.players.length > 0;

  async function runJsonAction(
    url: string,
    body?: Record<string, string>,
    options?: { method?: "POST" | "DELETE"; redirectTo?: string },
  ) {
    setError("");

    const response = await fetch(url, {
      method: options?.method ?? "POST",
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
      return false;
    }

    if (options?.redirectTo) {
      router.push(options.redirectTo);
      return true;
    }

    router.refresh();
    return true;
  }

  async function handleCopyInvite() {
    const inviteUrl = `${window.location.origin}/join/${game.inviteCode}`;
    await navigator.clipboard.writeText(inviteUrl);
    setCopyState("Invite copied");
    window.setTimeout(() => setCopyState(""), 2000);
  }

  async function handleSubmitEvidence(
    playerId: string,
    questId: string,
    formData: FormData,
  ) {
    setError("");
    formData.set("playerId", playerId);

    const response = await fetch(`/api/games/${game.id}/quests/${questId}/evidence`, {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Could not submit evidence.");
      return;
    }

    router.refresh();
  }

  function toggleValidationMenu(playerId: string) {
    setOpenValidationMenus((current) => ({
      ...current,
      [playerId]: !current[playerId],
    }));
  }

  function renderEvidenceAsset(quest: Quest) {
    if (!quest.evidence) {
      return null;
    }

    if (
      quest.evidence.kind === "video" &&
      /^\/|^https?:\/\//.test(quest.evidence.assetUrl)
    ) {
      return <video src={quest.evidence.assetUrl} controls className={styles.media} />;
    }

    if (quest.evidence.assetUrl.startsWith("/")) {
      return (
        <Image
          src={quest.evidence.assetUrl}
          alt={quest.evidence.description}
          width={480}
          height={280}
          className={styles.media}
        />
      );
    }

    return (
      <a href={quest.evidence.assetUrl} target="_blank" rel="noreferrer">
        Open evidence
      </a>
    );
  }

  function renderTripMap() {
    return (
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
    );
  }

  function renderRoster() {
    return (
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
    );
  }

  function renderPlayerDashboard(player: Player, validations: Quest[]) {
    const validationCount = validations.length;

    return (
      <article className={styles.panel}>
        <div className={styles.panelHeaderSplit}>
          <div className={styles.panelHeaderTitle}>
            <h2>{`${player.name}'s dashboard`}</h2>
            <span>
              {player.telegramHandle || "Simulator identity"} · {player.points} pts
            </span>
          </div>
          <button
            type="button"
            className={`${styles.notificationButton} ${validationCount > 0 ? styles.notificationButtonActive : ""}`}
            onClick={() => toggleValidationMenu(player.id)}
          >
            <span className={styles.notificationIcon} aria-hidden="true" />
            Validation inbox
            <span className={styles.notificationBadge}>{validationCount}</span>
          </button>
        </div>
        {game.status === "active" ? (
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              startTransition(async () => {
                await runJsonAction(
                  `/api/games/${game.id}/players/${player.id}/activity`,
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
                  player.activities.find(
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
        {openValidationMenus[player.id]
          ? renderValidationInbox(player, validations)
          : null}
      </article>
    );
  }

  function renderTodayQuest(player: Player, quest?: Quest) {
    if (!quest) {
      return null;
    }

    return (
      <article className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Today&apos;s quest</h2>
          <span>{quest.points} pts</span>
        </div>
        <div className={styles.questHero}>
          <strong>{quest.title}</strong>
          <span className={styles.questStatus}>{formatStatus(quest.status)}</span>
        </div>
        <p>{quest.brief}</p>
        <p className={styles.evidencePrompt}>Evidence brief: {quest.evidencePrompt}</p>
        {game.status === "active" ? (
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);

              startTransition(async () => {
                await handleSubmitEvidence(player.id, quest.id, formData);
              });
            }}
          >
            <label>
              Proof type
              <select name="kind" defaultValue={quest.evidence?.kind ?? "photo"}>
                <option value="photo">Photo</option>
                <option value="video">Video</option>
              </select>
            </label>
            <label>
              Evidence summary
              <input
                name="description"
                defaultValue={quest.evidence?.description ?? ""}
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
                defaultValue={quest.evidence?.assetUrl ?? ""}
                placeholder="https://... or simulator://proof"
              />
            </label>
            <button type="submit" disabled={isPending}>
              Submit evidence for validation
            </button>
          </form>
        ) : null}
        {quest.evidence ? (
          <div className={styles.evidenceCard}>
            <span>{quest.evidence.kind.toUpperCase()}</span>
            <p>{quest.evidence.description}</p>
            {renderEvidenceAsset(quest)}
          </div>
        ) : null}
      </article>
    );
  }

  function renderQuestHistory(player: Player, history: Quest[]) {
    if (history.length === 0) {
      return null;
    }

    return (
      <article className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Quest history</h2>
          <span>{player.name}&apos;s receipts</span>
        </div>
        <div className={styles.historyList}>
          {history.map((quest) => (
            <div key={quest.id} className={styles.historyCard}>
              <strong>{quest.title}</strong>
              <span>
                Day {quest.dayNumber} · {quest.points} pts · {formatStatus(quest.status)}
              </span>
            </div>
          ))}
        </div>
      </article>
    );
  }

  function renderValidationInbox(player: Player, validations: Quest[]) {
    return (
      <section className={styles.validationMenu}>
        <div className={styles.panelHeader}>
          <h3>Validation inbox</h3>
          <span>{validations.length} pending</span>
        </div>
        {validations.length === 0 ? (
          <p className={styles.emptyState}>
            No pending evidence from other players right now.
          </p>
        ) : (
          <div className={styles.validationList}>
            {validations.map((quest) => {
              const owner = game.players.find((entry) => entry.id === quest.playerId);

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
                          playerId: player.id,
                          decision: String(formData.get("decision") ?? "approved"),
                          note: String(formData.get("note") ?? ""),
                        },
                      );
                    });
                  }}
                >
                  <div className={styles.validationHeader}>
                    <strong>{owner?.name}</strong>
                    <span>{quest.points} pts</span>
                  </div>
                  <p>{quest.title}</p>
                  <span>{quest.evidence?.description}</span>
                  {quest.evidence ? (
                    <div className={styles.evidenceCard}>
                      <span>{quest.evidence.kind.toUpperCase()}</span>
                      <p>{quest.evidence.description}</p>
                      {renderEvidenceAsset(quest)}
                    </div>
                  ) : null}
                  <label>
                    Validator note
                    <input
                      name="note"
                      placeholder="Looks legit / needs a better angle"
                    />
                  </label>
                  <div className={styles.validationButtons}>
                    <button type="submit" name="decision" value="approved">
                      Accept and award points
                    </button>
                    <button
                      type="submit"
                      name="decision"
                      value="rejected"
                      className={styles.ghostButton}
                    >
                      Reject evidence
                    </button>
                  </div>
                </form>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  function renderNarratorFeed(player?: Player, messages = visibleMessages) {
    return (
      <article className={styles.panel}>
        <div className={styles.panelHeader}>
          <h2>Narrator feed</h2>
          <span>
            {player ? `${player.name}'s updates` : hostPlayer?.name ?? "Trip feed"}
          </span>
        </div>
        <div className={styles.feed}>
          {messages.map((message) => (
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
    );
  }

  function renderPlayerChooser() {
    return (
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
    );
  }

  function renderFinale() {
    if (game.status !== "finished") {
      return null;
    }

    return (
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
    );
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
            <span>
              {game.status === "lobby"
                ? "Lobby open"
                : `Day ${game.currentDay} of ${game.totalDays}`}
            </span>
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
          {canManageGame ? (
            <div className={styles.hostControls}>
              <div className={styles.panelHeader}>
                <h2>{isHost ? "Host controls" : "Simulator controls"}</h2>
                <span>{game.accessMode === "simulator" ? "Simulator mode" : "Live flow"}</span>
              </div>
              <div className={styles.hostActions}>
                {game.accessMode === "simulator" && game.status === "lobby" ? (
                  <button
                    type="button"
                    className={styles.ghostButton}
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await runJsonAction(`/api/games/${game.id}/join`, {
                          name: nextSimulatorPlayerName(game.players),
                        });
                      })
                    }
                  >
                    Add random player
                  </button>
                ) : null}
                {isHost && game.status === "lobby" ? (
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
                {isHost && game.status === "active" ? (
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await runJsonAction(`/api/games/${game.id}/days/next`);
                      })
                    }
                  >
                    {game.currentDay >= game.totalDays
                      ? "Trigger finale"
                      : "Advance to next day"}
                  </button>
                ) : null}
                {isHost && game.status !== "finished" ? (
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
                {canManageGame ? (
                  <button
                    type="button"
                    className={styles.ghostButton}
                    disabled={isPending}
                    onClick={() => {
                      if (!window.confirm("Reset this game back to the lobby and keep the current roster?")) {
                        return;
                      }

                      startTransition(async () => {
                        await runJsonAction(
                          `/api/games/${game.id}/reset`,
                          isHost && currentPlayer
                            ? { playerId: currentPlayer.id }
                            : undefined,
                        );
                      });
                    }}
                  >
                    Reset game
                  </button>
                ) : null}
                {canManageGame ? (
                  <button
                    type="button"
                    className={styles.ghostButton}
                    disabled={isPending}
                    onClick={() => {
                      if (!window.confirm("Delete this game permanently? This cannot be undone.")) {
                        return;
                      }

                      startTransition(async () => {
                        await runJsonAction(
                          `/api/games/${game.id}`,
                          isHost && currentPlayer
                            ? { playerId: currentPlayer.id }
                            : undefined,
                          {
                            method: "DELETE",
                            redirectTo:
                              game.accessMode === "simulator" ? "/simulator" : "/",
                          },
                        );
                      });
                    }}
                  >
                    Delete game
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className={styles.heroMeta}>
            <span>Groom: {game.groomName}</span>
            <span>
              {formatDate(game.startDate)} to {formatDate(game.endDate)}
            </span>
            <span>
              {game.accessMode === "telegram" ? "Telegram-ready flow" : "Simulator mode"}
            </span>
          </div>
        </div>
      </header>

      <main className={`${styles.layout} ${showSimulatorSplitView ? styles.mobileOnlyLayout : ""}`}>
        <section className={styles.playerStack}>
          {currentPlayer
            ? renderPlayerDashboard(currentPlayer, pendingValidations)
            : renderPlayerChooser()}
          {currentPlayer ? renderTodayQuest(currentPlayer, todayQuest) : null}
          {currentPlayer ? renderQuestHistory(currentPlayer, questHistory) : null}
          {renderFinale()}
        </section>

        <section className={styles.feedRail}>
          {renderNarratorFeed(currentPlayer, visibleMessages)}
          {error ? (
            <article className={styles.errorPanel}>
              <strong>Action blocked</strong>
              <p>{error}</p>
            </article>
          ) : null}
        </section>

        <section className={styles.overviewRail}>
          {renderTripMap()}
          {renderRoster()}
        </section>
      </main>

      {showSimulatorSplitView ? (
        <section className={styles.desktopSplitView}>
          <div className={styles.desktopOverview}>
            {renderTripMap()}
            {renderRoster()}
          </div>
          {error ? (
            <article className={styles.errorPanel}>
              <strong>Action blocked</strong>
              <p>{error}</p>
            </article>
          ) : null}
          <div className={styles.playerBoardGrid}>
            {game.players.map((player) => {
              const boardQuest = playerQuestForDay(game, player.id, game.currentDay);
              const boardHistory = questHistoryForPlayer(game, player.id);
              const boardValidations = pendingValidationsForPlayer(game, player.id);
              const boardMessages = recentMessages(game, player);

              return (
                <section key={player.id} className={styles.playerBoard}>
                  <div className={styles.playerBoardTopline}>
                    <span>{player.roleTitle}</span>
                    <Link href={`/game/${game.id}?player=${player.id}`}>Solo view</Link>
                  </div>
                  {renderPlayerDashboard(player, boardValidations)}
                  {renderTodayQuest(player, boardQuest)}
                  {renderQuestHistory(player, boardHistory)}
                  {renderNarratorFeed(player, boardMessages)}
                </section>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
