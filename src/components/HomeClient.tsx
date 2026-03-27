"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import type { TelegramAuthSession } from "@/lib/telegram-auth";
import { listStoryBeats } from "@/lib/story";
import { readTelegramWebAppChatId } from "@/lib/telegram-webapp";
import type { JoinedGameSummary } from "@/lib/types";
import styles from "./home-client.module.css";

function offsetDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

const SAMPLE_CREW = [
  { key: "tincho", label: "The Groom" },
  { key: "fede", label: "The Planner" },
  { key: "javi", label: "The Guardian" },
  { key: "luqui", label: "The Chaos Agent" },
  { key: "seba", label: "The Chronicler" },
];

const DEFAULT_GAME_TITLE = "Weekend of Bad Decisions";
const DEFAULT_GROOM_NAME = "Tincho";
const DEFAULT_HOST_NAME = "Fede";

export function HomeClient({
  showSimulatorLink,
  telegramAuth,
  telegramBotUsername,
  telegramLoginEnabled,
}: {
  showSimulatorLink: boolean;
  telegramAuth: TelegramAuthSession | null;
  telegramBotUsername?: string | null;
  telegramLoginEnabled: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [createError, setCreateError] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [resumeResults, setResumeResults] = useState<JoinedGameSummary[]>([]);
  const [searchedHandle, setSearchedHandle] = useState("");
  const [isCreatePending, startCreateTransition] = useTransition();
  const [isLookupPending, startLookupTransition] = useTransition();
  const linkedHandle = telegramAuth?.username ? `@${telegramAuth.username}` : "";
  const linkedUserId = telegramAuth?.id ?? "";
  const telegramAuthError = searchParams.get("telegramAuthError") ?? "";

  async function handleCreate(formData: FormData) {
    setCreateError("");
    const telegramChatId = readTelegramWebAppChatId();

    const payload = {
      title: String(formData.get("title") ?? "").trim() || DEFAULT_GAME_TITLE,
      groomName: String(formData.get("groomName") ?? "").trim() || DEFAULT_GROOM_NAME,
      startDate: String(formData.get("startDate") ?? ""),
      endDate: String(formData.get("endDate") ?? ""),
      hostName: String(formData.get("hostName") ?? "").trim() || DEFAULT_HOST_NAME,
      telegramUserId:
        String(formData.get("telegramUserId") ?? "").trim() || linkedUserId,
      ...(telegramChatId ? { telegramChatId } : {}),
      accessMode: "telegram" as const,
      enabledTags: [
        formData.get("tag_alcohol") ? "alcohol" : null,
        formData.get("tag_locuras") ? "locuras" : null,
        formData.get("tag_vegas") ? "vegas" : null,
      ].filter(Boolean),
    };

    startCreateTransition(async () => {
      const response = await fetch("/api/games", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as {
        error?: string;
        gameId?: string;
        hostPlayerId?: string;
      };

      if (!response.ok || !data.gameId || !data.hostPlayerId) {
        setCreateError(data.error ?? "Could not create the game.");
        return;
      }

      router.push(`/game/${data.gameId}?player=${data.hostPlayerId}`);
    });
  }

  async function handleResumeLookup(formData: FormData) {
    const telegramUserId =
      String(formData.get("telegramUserId") ?? "").trim() || linkedUserId;

    setResumeError("");
    setSearchedHandle(telegramUserId);

    const response = await fetch(
      `/api/games?telegramUserId=${encodeURIComponent(telegramUserId)}`,
    );
    const data = (await response.json()) as {
      error?: string;
      games?: JoinedGameSummary[];
    };

    if (!response.ok) {
      setResumeResults([]);
      setResumeError(data.error ?? "Could not look up your games.");
      return;
    }

    setResumeResults(data.games ?? []);
  }

  function formatResumeState(game: JoinedGameSummary) {
    if (game.status === "lobby") {
      return "Lobby open";
    }

    if (game.status === "finished") {
      return "Finished";
    }

    return `Day ${game.currentDay} of ${game.totalDays}`;
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>PixelParty</p>
          <h1>Pixel chaos, Telegram-ready narration, and a daily quest race your friends can actually play together.</h1>
          <p className={styles.summary}>
            Inspired by the original PixelForge Thailand bachelor game, this new MVP shifts the experience into a dynamic multiplayer WebApp. One player opens the run, the crew joins through a public invite link, the narrator sets the scene every day, and each side quest ends only after two rivals validate the photo or video evidence.
          </p>
          <div className={styles.heroActions}>
            <a href="#create" className={styles.primaryAction}>
              Create The Game
            </a>
            {showSimulatorLink ? (
              <Link href="/simulator" className={styles.secondaryAction}>
                Open Local Simulator
              </Link>
            ) : null}
          </div>
          <div className={styles.telegramNote}>
            <strong>Telegram note.</strong> You can now pre-link a real Telegram account from the website, and players who open the Web App from Telegram can still trigger the first DM immediately through the bot flow. After that, linked players can receive the daily quest in Telegram and submit photo or video evidence there with a caption.
            {telegramBotUsername ? ` Current bot: @${telegramBotUsername}.` : ""}
          </div>
        </div>
        <div className={styles.sceneCard}>
          <Image
            src="/pixelforge/backgrounds/bg_khaosan.png"
            alt="Khao San Road pixel art"
            fill
            className={styles.sceneBackdrop}
            sizes="(max-width: 900px) 100vw, 40vw"
            priority
          />
          <div className={styles.sceneOverlay} />
          <div className={styles.sceneCast}>
            {SAMPLE_CREW.map((member) => (
              <div key={member.key} className={styles.castMember}>
                <Image
                  src={`/pixelforge/characters/${member.key}_1x.png`}
                  alt={member.label}
                  width={40}
                  height={64}
                  className={styles.sprite}
                />
                <span>{member.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.strip}>
        <div>
          <strong>Dynamic narrator</strong>
          <p>The story reacts to what players report each day, shifting future side quests around their behavior.</p>
        </div>
        <div>
          <strong>Proof + validation</strong>
          <p>Quests score only after the player submits evidence and two random party members validate it.</p>
        </div>
        <div>
          <strong>Epic ending</strong>
          <p>When the trip ends, everyone gets the same final scoreboard, titles, and receipts.</p>
        </div>
      </section>

      <section className={styles.mapSection}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Inspired Scene Flow</p>
          <h2>Same Thailand energy, remixed into a multi-day social game.</h2>
        </div>
        <div className={styles.mapGrid}>
          {listStoryBeats(5).map((beat, index) => (
            <article key={`${beat.id}-${index}`} className={styles.mapCard}>
              <div className={styles.mapImageWrap}>
                <Image
                  src={beat.backdrop}
                  alt={beat.label}
                  fill
                  className={styles.mapImage}
                  sizes="(max-width: 900px) 100vw, 30vw"
                />
              </div>
              <div className={styles.mapText}>
                <span>{`Day ${index + 1}`}</span>
                <h3>{beat.label}</h3>
                <p>{beat.narratorLead}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="create" className={styles.formSection}>
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>Create Or Resume</p>
          <h2>Open a new lobby or pull up every game already tied to your Telegram handle.</h2>
        </div>
        <div className={styles.formGrid}>
          <div className={`${styles.formCard} ${styles.resumeCard}`}>
            <div className={styles.sectionHeading}>
              <p className={styles.eyebrow}>Resume A Game</p>
              <h3>See every lobby or run you already joined.</h3>
            </div>
            <p className={styles.summary}>
              Enter the Telegram User ID you used when you joined. We&apos;ll list every matching game so you can jump back in without hunting for the old URL.
            </p>
            <form
              className={styles.lookupForm}
              onSubmit={(event) => {
                event.preventDefault();
                startLookupTransition(async () => {
                  await handleResumeLookup(new FormData(event.currentTarget));
                });
              }}
            >
              <label>
                Telegram User ID
                <input
                  name="telegramUserId"
                  placeholder="123456789"
                  defaultValue={linkedUserId}
                  required
                />
              </label>
              <button type="submit" disabled={isLookupPending}>
                {isLookupPending ? "Looking up games..." : "Find my games"}
              </button>
            </form>
            {resumeError ? <p className={styles.error}>{resumeError}</p> : null}
            {resumeResults.length > 0 ? (
              <div className={styles.resumeList}>
                {resumeResults.map((game) => (
                  <article
                    key={`${game.gameId}:${game.playerId}`}
                    className={styles.resumeItem}
                  >
                    <div className={styles.resumeMeta}>
                      <strong>{game.title}</strong>
                      <span>{formatResumeState(game)}</span>
                      <span>{`${game.startDate} to ${game.endDate}`}</span>
                      <span>{`You joined as ${game.playerName}`}</span>
                      <span>{`Host: ${game.hostName}`}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.secondaryAction}
                      onClick={() => {
                        router.push(`/game/${game.gameId}?player=${game.playerId}`);
                      }}
                    >
                      Resume play
                    </button>
                  </article>
                ))}
              </div>
            ) : null}
            {searchedHandle &&
            !resumeError &&
            !isLookupPending &&
            resumeResults.length === 0 ? (
              <p className={styles.emptyState}>
                No games found for {searchedHandle}. Join a game from an invite link first.
              </p>
            ) : null}
          </div>

          <form
            className={styles.formCard}
            onSubmit={(event) => {
              event.preventDefault();
              void handleCreate(new FormData(event.currentTarget));
            }}
          >
            {telegramLoginEnabled ? (
              <div className={styles.identityCard}>
                <strong>
                  {telegramAuth ? "Telegram account linked" : "Link Telegram first"}
                </strong>
                <p>
                  {telegramAuth
                    ? `Signed in as ${linkedHandle || telegramAuth.name}. This verified account can be used as your host identity and as the browser-side shortcut for future bot DMs.`
                    : "Sign in with Telegram here to link the host to a verified Telegram account and request direct-message access without sending people back to the bot first."}
                </p>
                <div className={styles.identityActions}>
                  <a
                    href={
                      telegramAuth
                        ? "/api/telegram/logout?returnTo=%2F%23create"
                        : "/api/telegram/login?returnTo=%2F%23create"
                    }
                    className={styles.secondaryAction}
                  >
                    {telegramAuth ? "Switch Telegram Account" : "Continue With Telegram"}
                  </a>
                </div>
                {telegramAuthError ? (
                  <p className={styles.error}>{telegramAuthError}</p>
                ) : null}
              </div>
            ) : null}
            <label>
              Game title
              <input name="title" placeholder={DEFAULT_GAME_TITLE} />
            </label>
            <label>
              Groom name
              <input name="groomName" placeholder={DEFAULT_GROOM_NAME} />
            </label>
            <label>
              Host name
              <input name="hostName" placeholder={DEFAULT_HOST_NAME} />
            </label>
            <label>
              Your Telegram User ID
              <input
                name="telegramUserId"
                placeholder="123456789"
                defaultValue={linkedUserId}
                readOnly={Boolean(linkedUserId)}
                required={!telegramAuth}
              />
            </label>
            {telegramAuth ? (
              <p className={styles.fieldHint}>
                Telegram is linked. Your numeric user ID will be used for bot messages.
              </p>
            ) : (
              <p className={styles.fieldHint}>
                Message @userinfobot in Telegram to get your numeric user ID.
              </p>
            )}
            <div className={styles.dateRow}>
              <label>
                Start date
                <input
                  name="startDate"
                  type="date"
                  defaultValue={offsetDate(0)}
                  required
                />
              </label>
              <label>
                End date
                <input
                  name="endDate"
                  type="date"
                  defaultValue={offsetDate(3)}
                  required
                />
              </label>
            </div>
            <fieldset className={styles.tagFieldset}>
              <legend>Quest spice level</legend>
              <label className={styles.tagLabel}>
                <input type="checkbox" name="tag_alcohol" defaultChecked />
                Alcohol quests
              </label>
              <label className={styles.tagLabel}>
                <input type="checkbox" name="tag_locuras" defaultChecked />
                Wild dares
              </label>
              <label className={styles.tagLabel}>
                <input type="checkbox" name="tag_vegas" />
                Vegas rules (no-filter confessions)
              </label>
            </fieldset>
            {createError ? <p className={styles.error}>{createError}</p> : null}
            <button type="submit" disabled={isCreatePending}>
              {isCreatePending ? "Opening lobby..." : "Create Telegram-Ready Game"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
