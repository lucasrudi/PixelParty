import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, finishGame, joinGame, startGame, submitEvidence, validateQuest } from "@/lib/game-engine";

interface MockGameRow {
  id: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
  payload: unknown;
}

const mockRows = new Map<string, MockGameRow>();
const blobPutMock = vi.fn();

function cloneRow(row: MockGameRow) {
  return {
    ...row,
    payload:
      typeof row.payload === "string"
        ? row.payload
        : JSON.parse(JSON.stringify(row.payload)),
  };
}

function normalizeQuery(strings: readonly string[]) {
  return strings.join(" ").replace(/\s+/g, " ").trim().toLowerCase();
}

vi.mock("postgres", () => ({
  default: vi.fn(() => {
    const sql = Object.assign(
      async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const query = normalizeQuery(strings);

        if (
          query.startsWith("create table") ||
          query.startsWith("create unique index") ||
          query.startsWith("create index")
        ) {
          return [];
        }

        if (query === "delete from games") {
          mockRows.clear();
          return [];
        }

        if (
          query.includes("from games order by created_at desc") &&
          !query.includes("where")
        ) {
          return [...mockRows.values()]
            .sort((left, right) => right.created_at.localeCompare(left.created_at))
            .map((row) => cloneRow(row));
        }

        if (query.includes("where id =") && query.includes("limit 1")) {
          const id = String(values[0]);
          return mockRows.has(id) ? [cloneRow(mockRows.get(id)!)] : [];
        }

        if (query.includes("where id =") && query.includes("for update")) {
          const id = String(values[0]);
          return mockRows.has(id) ? [cloneRow(mockRows.get(id)!)] : [];
        }

        if (query.includes("where lower(invite_code) = lower(")) {
          const inviteCode = String(values[0]).toLowerCase();
          const row = [...mockRows.values()].find(
            (entry) => entry.invite_code.toLowerCase() === inviteCode,
          );
          return row ? [cloneRow(row)] : [];
        }

        if (query.startsWith("insert into games")) {
          const [id, inviteCode, createdAt, updatedAt, payload] = values;

          mockRows.set(String(id), {
            id: String(id),
            invite_code: String(inviteCode),
            created_at: String(createdAt),
            updated_at: String(updatedAt),
            payload: typeof payload === "string" ? payload : JSON.stringify(payload),
          });

          return [];
        }

        if (query.startsWith("update games")) {
          const [inviteCode, createdAt, updatedAt, payload, id] = values;

          mockRows.set(String(id), {
            id: String(id),
            invite_code: String(inviteCode),
            created_at: String(createdAt),
            updated_at: String(updatedAt),
            payload: typeof payload === "string" ? payload : JSON.stringify(payload),
          });

          return [];
        }

        if (query.startsWith("delete from games") && query.includes("returning id")) {
          const id = String(values[0]);
          const existed = mockRows.delete(id);
          return existed ? [{ id }] : [];
        }

        throw new Error(`Unhandled mocked SQL query: ${query}`);
      },
      {
        begin: async <T>(callback: (sql: unknown) => Promise<T>) => callback(sql),
      },
    );

    return sql;
  }),
}));

vi.mock("@vercel/blob", () => ({
  put: blobPutMock,
}));

describe.sequential("mocked production infrastructure flows", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    mockRows.clear();
    blobPutMock.mockReset();
    blobPutMock.mockResolvedValue({
      url: "https://blob.vercel-storage.com/evidence/proof.png",
    });
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
      VERCEL: "1",
      POSTGRES_URL: "postgres://pixelparty.test/game",
      BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_test",
      PIXELPARTY_ENABLE_SIMULATOR: "false",
    };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it("runs the production storage and upload flow with mocked Postgres and Blob services", async () => {
    const store = await import("@/lib/store");
    const uploads = await import("@/lib/uploads");

    const game = createGame({
      title: "Production Bash",
      groomName: "Tincho",
      hostName: "Fede",
      telegramHandle: "@fede",
      startDate: "2026-03-27",
      endDate: "2026-03-29",
      accessMode: "telegram",
    });

    await store.saveGame(game);

    const created = await store.getGame(game.id);
    expect(created?.players).toHaveLength(1);

    await store.updateGame(game.id, (current) => {
      joinGame(current, { name: "Mauri", telegramHandle: "@mauri" });
      joinGame(current, { name: "Seba", telegramHandle: "@seba" });
      return startGame(current);
    });

    const startedGame = await store.getGame(game.id);
    const mauri = startedGame?.players.find((player) => player.name === "Mauri");
    const seba = startedGame?.players.find((player) => player.name === "Seba");
    const mauriQuest = startedGame?.quests.find(
      (quest) =>
        quest.playerId === mauri?.id && quest.dayNumber === startedGame.currentDay,
    );
    const uploaded = await uploads.saveBrowserFile(
      new File(["proof"], "proof.png", { type: "image/png" }),
    );

    expect(blobPutMock).toHaveBeenCalledTimes(1);

    await store.updateGame(game.id, (current) => {
      submitEvidence(current, mauri!.id, mauriQuest!.id, {
        description: "Blob upload proof",
        kind: "photo",
        assetUrl: uploaded.assetUrl,
        fileName: uploaded.fileName,
      });

      return validateQuest(current, seba!.id, mauriQuest!.id, {
        decision: "approved",
        note: "Approved in production mode",
      });
    });

    const validated = await store.getGame(game.id);
    const completedQuest = validated?.quests.find((quest) => quest.id === mauriQuest!.id);

    expect(validated?.players).toHaveLength(3);
    expect(
      validated?.players.find((player) => player.id === game.hostPlayerId)?.name,
    ).toBe("Fede");
    expect(completedQuest?.status).toBe("completed");
    expect(completedQuest?.evidence?.assetUrl).toContain("blob.vercel-storage.com");

    const inviteGame = await store.getGameByInvite(game.inviteCode);
    expect(inviteGame?.id).toBe(game.id);

    await store.updateGame(game.id, (current) => finishGame(current));

    const finished = await store.getGame(game.id);
    expect(finished?.status).toBe("finished");
  });
});
