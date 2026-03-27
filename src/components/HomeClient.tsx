"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { listStoryBeats } from "@/lib/story";
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
  telegramBotUrl,
  telegramBotUsername,
}: {
  showSimulatorLink: boolean;
  telegramBotUrl?: string | null;
  telegramBotUsername?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleCreate(formData: FormData) {
    setError("");

    const payload = {
      title: String(formData.get("title") ?? "").trim() || DEFAULT_GAME_TITLE,
      groomName: String(formData.get("groomName") ?? "").trim() || DEFAULT_GROOM_NAME,
      startDate: String(formData.get("startDate") ?? ""),
      endDate: String(formData.get("endDate") ?? ""),
      hostName: String(formData.get("hostName") ?? "").trim() || DEFAULT_HOST_NAME,
      telegramHandle: String(formData.get("telegramHandle") ?? ""),
      accessMode: "telegram" as const,
      enabledTags: [
        formData.get("tag_alcohol") ? "alcohol" : null,
        formData.get("tag_locuras") ? "locuras" : null,
        formData.get("tag_vegas") ? "vegas" : null,
      ].filter(Boolean),
    };

    startTransition(async () => {
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
        setError(data.error ?? "Could not create the game.");
        return;
      }

      router.push(`/game/${data.gameId}?player=${data.hostPlayerId}`);
    });
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
            {telegramBotUrl ? (
              <a
                href={telegramBotUrl}
                className={styles.secondaryAction}
                target="_blank"
                rel="noreferrer"
              >
                Open Telegram Bot
              </a>
            ) : null}
          </div>
          <div className={styles.telegramNote}>
            <strong>Telegram note.</strong> This app now reads the bot configuration from environment variables for server-side Telegram integration, but gameplay delivery is still Telegram-ready rather than full Telegram DM automation. Players should still start the bot once and use the same handle they enter in the app.
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
          <p className={styles.eyebrow}>Create A Game Instance</p>
          <h2>Open the lobby, set the trip window, and get a public join link.</h2>
        </div>
        <form
          className={styles.formCard}
          onSubmit={(event) => {
            event.preventDefault();
            void handleCreate(new FormData(event.currentTarget));
          }}
        >
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
            Host Telegram
            <input name="telegramHandle" placeholder="@fede" required />
          </label>
          <div className={styles.dateRow}>
            <label>
              Start date
              <input name="startDate" type="date" defaultValue={offsetDate(0)} required />
            </label>
            <label>
              End date
              <input name="endDate" type="date" defaultValue={offsetDate(3)} required />
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
          {error ? <p className={styles.error}>{error}</p> : null}
          <button type="submit" disabled={isPending}>
            {isPending ? "Opening lobby..." : "Create Telegram-Ready Game"}
          </button>
        </form>
      </section>
    </div>
  );
}
