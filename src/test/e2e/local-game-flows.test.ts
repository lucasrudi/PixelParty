import { mkdtemp, rm } from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formRequest,
  jsonRequest,
  readJson,
  routeContext,
} from "@/test/route-helpers";

describe.sequential("local filesystem game flows", () => {
  const originalEnv = { ...process.env };
  const originalCwd = process.cwd();
  let tempDir = "";

  beforeEach(async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "pixelparty-local-"));
    process.chdir(tempDir);
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      PIXELPARTY_ENABLE_SIMULATOR: "true",
    };
    delete process.env.POSTGRES_URL;
    delete process.env.DATABASE_URL;
    delete process.env.BLOB_READ_WRITE_TOKEN;
    delete process.env.VERCEL;
    vi.resetModules();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    process.env = { ...originalEnv };
    vi.resetModules();
    await rm(tempDir, { recursive: true, force: true });
  });

  it("runs the common telegram game lifecycle against local storage", async () => {
    const gamesRoute = await import("@/app/api/games/route");
    const gameRoute = await import("@/app/api/games/[gameId]/route");
    const joinRoute = await import("@/app/api/games/[gameId]/join/route");
    const startRoute = await import("@/app/api/games/[gameId]/start/route");
    const nextDayRoute = await import("@/app/api/games/[gameId]/days/next/route");
    const finishRoute = await import("@/app/api/games/[gameId]/finish/route");
    const store = await import("@/lib/store");

    const createResponse = await gamesRoute.POST(
      jsonRequest("http://localhost/api/games", {
        title: "Weekend of Bad Decisions",
        groomName: "Tincho",
        hostName: "Fede",
        telegramHandle: "@fede",
        startDate: "2026-03-27",
        endDate: "2026-03-30",
        accessMode: "telegram",
      }),
    );
    const created = await readJson<{
      gameId: string;
      inviteCode: string;
      hostPlayerId: string;
    }>(createResponse);

    expect(createResponse.ok).toBe(true);
    expect(created.inviteCode).toHaveLength(6);

    const storedGame = await store.getGame(created.gameId);
    const inviteGame = await store.getGameByInvite(created.inviteCode);

    expect(storedGame?.hostPlayerId).toBe(created.hostPlayerId);
    expect(inviteGame?.id).toBe(created.gameId);

    for (const player of [
      { name: "Mauri", telegramHandle: "@mauri" },
      { name: "Seba", telegramHandle: "@seba" },
    ]) {
      const joinResponse = await joinRoute.POST(
        jsonRequest(`http://localhost/api/games/${created.gameId}/join`, player),
        routeContext({ gameId: created.gameId }),
      );
      expect(joinResponse.ok).toBe(true);
    }

    const startResponse = await startRoute.POST(
      new Request(`http://localhost/api/games/${created.gameId}/start`, {
        method: "POST",
      }),
      routeContext({ gameId: created.gameId }),
    );
    const started = await readJson<{ currentDay: number }>(startResponse);

    expect(startResponse.ok).toBe(true);
    expect(started.currentDay).toBe(1);

    const nextResponse = await nextDayRoute.POST(
      new Request(`http://localhost/api/games/${created.gameId}/days/next`, {
        method: "POST",
      }),
      routeContext({ gameId: created.gameId }),
    );
    const nextDay = await readJson<{ currentDay: number; status: string }>(nextResponse);

    expect(nextResponse.ok).toBe(true);
    expect(nextDay.currentDay).toBe(2);
    expect(nextDay.status).toBe("active");

    const finishResponse = await finishRoute.POST(
      new Request(`http://localhost/api/games/${created.gameId}/finish`, {
        method: "POST",
      }),
      routeContext({ gameId: created.gameId }),
    );
    const finished = await readJson<{ status: string }>(finishResponse);

    expect(finishResponse.ok).toBe(true);
    expect(finished.status).toBe("finished");

    const getResponse = await gameRoute.GET(
      new Request(`http://localhost/api/games/${created.gameId}`),
      routeContext({ gameId: created.gameId }),
    );
    const loadedGame = await readJson<{
      status: string;
      currentDay: number;
      players: Array<{ id: string }>;
      finaleCards: unknown[];
    }>(getResponse);

    expect(getResponse.ok).toBe(true);
    expect(loadedGame.status).toBe("finished");
    expect(loadedGame.currentDay).toBe(2);
    expect(loadedGame.players).toHaveLength(3);
    expect(loadedGame.finaleCards.length).toBeGreaterThan(0);
  });

  it("runs the simulator actions locally, including activity, evidence, validation, reset, and delete", async () => {
    const gamesRoute = await import("@/app/api/games/route");
    const gameRoute = await import("@/app/api/games/[gameId]/route");
    const joinRoute = await import("@/app/api/games/[gameId]/join/route");
    const startRoute = await import("@/app/api/games/[gameId]/start/route");
    const nextDayRoute = await import("@/app/api/games/[gameId]/days/next/route");
    const resetRoute = await import("@/app/api/games/[gameId]/reset/route");
    const activityRoute = await import(
      "@/app/api/games/[gameId]/players/[playerId]/activity/route"
    );
    const evidenceRoute = await import(
      "@/app/api/games/[gameId]/quests/[questId]/evidence/route"
    );
    const validateRoute = await import(
      "@/app/api/games/[gameId]/quests/[questId]/validate/route"
    );
    const store = await import("@/lib/store");

    const createResponse = await gamesRoute.POST(
      jsonRequest("http://localhost/api/games", {
        title: "Simulator Bash",
        groomName: "Tincho",
        hostName: "Fede",
        startDate: "2026-03-27",
        endDate: "2026-03-29",
        accessMode: "simulator",
      }),
    );
    const created = await readJson<{
      gameId: string;
      hostPlayerId: string;
    }>(createResponse);

    expect(createResponse.ok).toBe(true);

    for (const name of ["Mauri", "Seba"]) {
      const joinResponse = await joinRoute.POST(
        jsonRequest(`http://localhost/api/games/${created.gameId}/join`, { name }),
        routeContext({ gameId: created.gameId }),
      );
      expect(joinResponse.ok).toBe(true);
    }

    const startResponse = await startRoute.POST(
      new Request(`http://localhost/api/games/${created.gameId}/start`, {
        method: "POST",
      }),
      routeContext({ gameId: created.gameId }),
    );

    expect(startResponse.ok).toBe(true);

    const startedGame = await store.getGame(created.gameId);
    const mauri = startedGame?.players.find((player) => player.name === "Mauri");
    const seba = startedGame?.players.find((player) => player.name === "Seba");
    const mauriQuest = startedGame?.quests.find(
      (quest) =>
        quest.playerId === mauri?.id && quest.dayNumber === startedGame.currentDay,
    );

    expect(mauri?.id).toBeTruthy();
    expect(seba?.id).toBeTruthy();
    expect(mauriQuest?.id).toBeTruthy();

    const activityResponse = await activityRoute.POST(
      jsonRequest(
        `http://localhost/api/games/${created.gameId}/players/${mauri!.id}/activity`,
        { summary: "I found street food and filmed the chaos." },
      ),
      routeContext({ gameId: created.gameId, playerId: mauri!.id }),
    );
    expect(activityResponse.ok).toBe(true);

    const evidenceData = new FormData();
    evidenceData.set("playerId", mauri!.id);
    evidenceData.set("description", "Proof of the side quest");
    evidenceData.set("kind", "photo");
    evidenceData.set("proofUrl", "https://example.com/proof.jpg");

    const evidenceResponse = await evidenceRoute.POST(
      formRequest(
        `http://localhost/api/games/${created.gameId}/quests/${mauriQuest!.id}/evidence`,
        evidenceData,
      ),
      routeContext({ gameId: created.gameId, questId: mauriQuest!.id }),
    );
    expect(evidenceResponse.ok).toBe(true);

    const validateResponse = await validateRoute.POST(
      jsonRequest(
        `http://localhost/api/games/${created.gameId}/quests/${mauriQuest!.id}/validate`,
        {
          playerId: seba!.id,
          decision: "approved",
          note: "Looks good",
        },
      ),
      routeContext({ gameId: created.gameId, questId: mauriQuest!.id }),
    );
    expect(validateResponse.ok).toBe(true);

    const afterValidation = await store.getGame(created.gameId);
    const validatedQuest = afterValidation?.quests.find(
      (quest) => quest.id === mauriQuest!.id,
    );

    expect(validatedQuest?.status).toBe("completed");

    const nextResponse = await nextDayRoute.POST(
      new Request(`http://localhost/api/games/${created.gameId}/days/next`, {
        method: "POST",
      }),
      routeContext({ gameId: created.gameId }),
    );
    const nextDay = await readJson<{ currentDay: number }>(nextResponse);

    expect(nextDay.currentDay).toBe(2);

    const resetResponse = await resetRoute.POST(
      jsonRequest(`http://localhost/api/games/${created.gameId}/reset`, {}),
      routeContext({ gameId: created.gameId }),
    );
    const reset = await readJson<{ status: string }>(resetResponse);

    expect(resetResponse.ok).toBe(true);
    expect(reset.status).toBe("lobby");

    const deleteResponse = await gameRoute.DELETE(
      jsonRequest(`http://localhost/api/games/${created.gameId}`, {}, { method: "DELETE" }),
      routeContext({ gameId: created.gameId }),
    );

    expect(deleteResponse.ok).toBe(true);
    expect(await store.getGame(created.gameId)).toBeUndefined();
  });
});
