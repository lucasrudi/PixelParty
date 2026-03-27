import { promises as fs } from "fs";
import { UserFacingError } from "@/lib/errors";
import path from "path";
import postgres, { type Sql } from "postgres";
import { normalizeTelegramHandle } from "@/lib/game-engine";
import { Game, Player } from "@/lib/types";
import {
  assertGameStorageAvailable,
  getDatabaseUrl,
  resolveGameStorageDriver,
} from "@/lib/storage-config";

interface StoreShape {
  games: Record<string, Game>;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "games.json");
let storeQueue = Promise.resolve();
let sqlClient: Sql | null = null;
let ensureGamesTablePromise: Promise<void> | null = null;

interface GameRow {
  id: string;
  invite_code: string;
  created_at: string;
  updated_at: string;
  payload: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseGamePayload(payload: unknown) {
  if (typeof payload === "string") {
    return JSON.parse(payload) as unknown;
  }

  return payload;
}

export function hydrateGame(payload: unknown): Game {
  const parsedPayload = parseGamePayload(payload);

  if (!isRecord(parsedPayload)) {
    throw new Error("Stored game payload is invalid.");
  }

  const baseGame = parsedPayload as unknown as Game;

  const players = Array.isArray(parsedPayload.players)
    ? parsedPayload.players.map((player) =>
        isRecord(player)
          ? {
              ...player,
              activities: Array.isArray(player.activities) ? player.activities : [],
            }
          : player,
      )
    : [];
  const quests = Array.isArray(parsedPayload.quests)
    ? parsedPayload.quests.map((quest) =>
        isRecord(quest)
          ? {
              ...quest,
              validators: Array.isArray(quest.validators) ? quest.validators : [],
              validationVotes: Array.isArray(quest.validationVotes)
                ? quest.validationVotes
                : [],
            }
          : quest,
      )
    : [];

  return {
    ...baseGame,
    players: players as Game["players"],
    quests: quests as Game["quests"],
    messages: Array.isArray(parsedPayload.messages)
      ? (parsedPayload.messages as Game["messages"])
      : [],
    finaleCards: Array.isArray(parsedPayload.finaleCards)
      ? (parsedPayload.finaleCards as Game["finaleCards"])
      : [],
  };
}

function hydrateStorePayload(store: unknown): StoreShape {
  const rawGames = isRecord(store) && isRecord(store.games) ? store.games : {};

  return {
    games: Object.fromEntries(
      Object.entries(rawGames).map(([gameId, payload]) => {
        const game = hydrateGame(payload);
        return [game.id || gameId, game];
      }),
    ),
  };
}

function getSqlClient() {
  if (!sqlClient) {
    const databaseUrl = getDatabaseUrl();

    if (!databaseUrl) {
      throw new Error(
        "Postgres storage was selected, but POSTGRES_URL / DATABASE_URL is not set.",
      );
    }

    sqlClient = postgres(databaseUrl, { prepare: false });
  }

  return sqlClient;
}

async function ensureGamesTable() {
  if (!ensureGamesTablePromise) {
    ensureGamesTablePromise = (async () => {
      const sql = getSqlClient();

      await sql`
        create table if not exists games (
          id text primary key,
          invite_code text not null,
          created_at timestamptz not null,
          updated_at timestamptz not null,
          payload jsonb not null
        )
      `;
      await sql`
        create unique index if not exists games_invite_code_key
        on games (lower(invite_code))
      `;
      await sql`
        create index if not exists games_created_at_idx
        on games (created_at desc)
      `;
    })();
  }

  return ensureGamesTablePromise;
}

async function ensureStore() {
  assertGameStorageAvailable();
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.writeFile(
      STORE_FILE,
      JSON.stringify({ games: {} }, null, 2),
      "utf8",
    );
  }
}

async function readFilesystemStore(): Promise<StoreShape> {
  await ensureStore();
  const raw = await fs.readFile(STORE_FILE, "utf8");
  return hydrateStorePayload(JSON.parse(raw) as unknown);
}

async function writeFilesystemStore(store: StoreShape) {
  await ensureStore();
  const tempFile = `${STORE_FILE}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tempFile, STORE_FILE);
}

async function runExclusive<T>(operation: () => Promise<T>) {
  const next = storeQueue.then(operation, operation);
  storeQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

function mapGamesToStore(games: unknown[]): StoreShape {
  const hydratedGames = games.map((game) => hydrateGame(game));

  return {
    games: Object.fromEntries(hydratedGames.map((game) => [game.id, game])),
  };
}

async function readPostgresStore(): Promise<StoreShape> {
  await ensureGamesTable();
  const sql = getSqlClient();
  const rows = await sql<GameRow[]>`
    select id, invite_code, created_at, updated_at, payload
    from games
    order by created_at desc
  `;
  return mapGamesToStore(rows.map((row) => row.payload));
}

async function writePostgresStore(store: StoreShape) {
  await ensureGamesTable();
  const sql = getSqlClient();
  const games = Object.values(store.games);

  await sql.begin(async (transaction) => {
    const tx = transaction as unknown as Sql;

    if (games.length === 0) {
      await tx`delete from games`;
      return;
    }

    await tx`delete from games`;

    for (const game of games) {
      await tx`
        insert into games (id, invite_code, created_at, updated_at, payload)
        values (
          ${game.id},
          ${game.inviteCode},
          ${game.createdAt},
          ${game.updatedAt},
          cast(${JSON.stringify(game)} as jsonb)
        )
        on conflict (id) do update set
          invite_code = excluded.invite_code,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          payload = excluded.payload
      `;
    }
  });
}

export async function readStore(): Promise<StoreShape> {
  if (resolveGameStorageDriver() === "postgres") {
    return readPostgresStore();
  }

  return readFilesystemStore();
}

export async function writeStore(store: StoreShape) {
  if (resolveGameStorageDriver() === "postgres") {
    await writePostgresStore(store);
    return;
  }

  await writeFilesystemStore(store);
}

export async function listGames() {
  if (resolveGameStorageDriver() === "postgres") {
    await ensureGamesTable();
    const sql = getSqlClient();
    const rows = await sql<GameRow[]>`
      select id, invite_code, created_at, updated_at, payload
      from games
      order by created_at desc
    `;
    return rows.map((row) => hydrateGame(row.payload));
  }

  const store = await readFilesystemStore();
  return Object.values(store.games).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export async function listGamesForTelegramHandle(telegramHandle: string) {
  const normalizedHandle = normalizeTelegramHandle(telegramHandle);

  if (!normalizedHandle) {
    return [] as Array<{ game: Game; player: Player }>;
  }

  const games = await listGames();

  return games.flatMap((game) => {
    if (game.accessMode !== "telegram") {
      return [];
    }

    const player = game.players.find(
      (entry) =>
        entry.telegramHandle.toLowerCase() === normalizedHandle.toLowerCase(),
    );

    return player ? [{ game, player }] : [];
  });
}

export async function listGamesForTelegramUserId(telegramUserId: string) {
  const normalized = telegramUserId.trim();

  if (!normalized) {
    return [] as Array<{ game: Game; player: Player }>;
  }

  const games = await listGames();

  return games.flatMap((game) => {
    if (game.accessMode !== "telegram") {
      return [];
    }

    const player = game.players.find(
      (entry) =>
        entry.telegramUserId === normalized || entry.telegramChatId === normalized,
    );

    return player ? [{ game, player }] : [];
  });
}

export async function getGame(gameId: string) {
  if (resolveGameStorageDriver() === "postgres") {
    await ensureGamesTable();
    const sql = getSqlClient();
    const rows = await sql<GameRow[]>`
      select id, invite_code, created_at, updated_at, payload
      from games
      where id = ${gameId}
      limit 1
    `;
    return rows[0] ? hydrateGame(rows[0].payload) : undefined;
  }

  const store = await readFilesystemStore();
  return store.games[gameId];
}

export async function getGameByInvite(inviteCode: string) {
  if (resolveGameStorageDriver() === "postgres") {
    await ensureGamesTable();
    const sql = getSqlClient();
    const rows = await sql<GameRow[]>`
      select id, invite_code, created_at, updated_at, payload
      from games
      where lower(invite_code) = lower(${inviteCode})
      limit 1
    `;
    return rows[0] ? hydrateGame(rows[0].payload) : undefined;
  }

  const store = await readFilesystemStore();
  return Object.values(store.games).find(
    (game) => game.inviteCode.toLowerCase() === inviteCode.toLowerCase(),
  );
}

export async function saveGame(game: Game) {
  if (resolveGameStorageDriver() === "postgres") {
    await ensureGamesTable();
    const sql = getSqlClient();
    await sql`
      insert into games (id, invite_code, created_at, updated_at, payload)
      values (
        ${game.id},
        ${game.inviteCode},
        ${game.createdAt},
        ${game.updatedAt},
        cast(${JSON.stringify(game)} as jsonb)
      )
      on conflict (id) do update set
        invite_code = excluded.invite_code,
        created_at = excluded.created_at,
        updated_at = excluded.updated_at,
        payload = excluded.payload
    `;
    return game;
  }

  return runExclusive(async () => {
    const store = await readFilesystemStore();
    store.games[game.id] = game;
    await writeFilesystemStore(store);
    return game;
  });
}

export async function updateGame(
  gameId: string,
  updater: (game: Game) => Game,
) {
  if (resolveGameStorageDriver() === "postgres") {
    await ensureGamesTable();
    const sql = getSqlClient();

    return sql.begin(async (transaction) => {
      const tx = transaction as unknown as Sql;
      const rows = await tx<GameRow[]>`
        select id, invite_code, created_at, updated_at, payload
        from games
        where id = ${gameId}
        for update
      `;
      const game = rows[0] ? hydrateGame(rows[0].payload) : undefined;

      if (!game) {
        throw new UserFacingError("Game not found.");
      }

      const updatedGame = updater(structuredClone(game));

      await tx`
        update games
        set invite_code = ${updatedGame.inviteCode},
            created_at = ${updatedGame.createdAt},
            updated_at = ${updatedGame.updatedAt},
            payload = cast(${JSON.stringify(updatedGame)} as jsonb)
        where id = ${gameId}
      `;

      return updatedGame;
    });
  }

  return runExclusive(async () => {
    const store = await readFilesystemStore();
    const game = store.games[gameId];

    if (!game) {
      throw new UserFacingError("Game not found.");
    }

    store.games[gameId] = updater(structuredClone(game));
    await writeFilesystemStore(store);
    return store.games[gameId];
  });
}

export async function deleteGame(gameId: string) {
  if (resolveGameStorageDriver() === "postgres") {
    await ensureGamesTable();
    const sql = getSqlClient();
    const rows = await sql<{ id: string }[]>`
      delete from games
      where id = ${gameId}
      returning id
    `;

    if (rows.length === 0) {
      throw new UserFacingError("Game not found.");
    }

    return;
  }

  return runExclusive(async () => {
    const store = await readFilesystemStore();

    if (!store.games[gameId]) {
      throw new UserFacingError("Game not found.");
    }

    delete store.games[gameId];
    await writeFilesystemStore(store);
  });
}
