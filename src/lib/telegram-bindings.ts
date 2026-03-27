import { promises as fs } from "fs";
import path from "path";
import postgres, { type Sql } from "postgres";
import { getDatabaseUrl, resolveGameStorageDriver } from "@/lib/storage-config";
import {
  decryptTelegramValue,
  encryptTelegramValue,
  hashTelegramValue,
} from "@/lib/telegram-crypto";

interface TelegramBindingStoreShape {
  bindings: Record<string, TelegramBindingRecord>;
}

interface TelegramBindingRow {
  id: string;
  game_id: string;
  player_id: string;
  created_at: string;
  updated_at: string;
  payload: TelegramBindingRecord;
}

export interface TelegramBindingRecord {
  id: string;
  gameId: string;
  playerId: string;
  createdAt: string;
  updatedAt: string;
  boundAt: string;
  encryptedTelegramUserId: string;
  encryptedChatId: string;
  encryptedTelegramUsername?: string;
  encryptedTelegramUserHash: string;
  encryptedChatHash: string;
}

export interface TelegramBinding {
  id: string;
  gameId: string;
  playerId: string;
  createdAt: string;
  updatedAt: string;
  boundAt: string;
  telegramUserId: string;
  chatId: string;
  telegramUsername?: string;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "telegram-bindings.json");
let sqlClient: Sql | null = null;
let ensureBindingsTablePromise: Promise<void> | null = null;
let bindingQueue = Promise.resolve();

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

async function ensureBindingsTable() {
  if (!ensureBindingsTablePromise) {
    ensureBindingsTablePromise = (async () => {
      const sql = getSqlClient();

      await sql`
        create table if not exists telegram_bindings (
          id text primary key,
          game_id text not null,
          player_id text not null unique,
          created_at timestamptz not null,
          updated_at timestamptz not null,
          payload jsonb not null
        )
      `;
      await sql`
        create index if not exists telegram_bindings_game_id_idx
        on telegram_bindings (game_id)
      `;
    })();
  }

  return ensureBindingsTablePromise;
}

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(STORE_FILE);
  } catch {
    await fs.writeFile(
      STORE_FILE,
      JSON.stringify({ bindings: {} }, null, 2),
      "utf8",
    );
  }
}

async function runExclusive<T>(operation: () => Promise<T>) {
  const next = bindingQueue.then(operation, operation);
  bindingQueue = next.then(
    () => undefined,
    () => undefined,
  );
  return next;
}

async function readFilesystemStore(): Promise<TelegramBindingStoreShape> {
  await ensureStore();
  const raw = await fs.readFile(STORE_FILE, "utf8");
  const parsed = JSON.parse(raw) as Partial<TelegramBindingStoreShape>;

  return {
    bindings: parsed.bindings ?? {},
  };
}

async function writeFilesystemStore(store: TelegramBindingStoreShape) {
  await ensureStore();
  const tempFile = `${STORE_FILE}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(tempFile, JSON.stringify(store, null, 2), "utf8");
  await fs.rename(tempFile, STORE_FILE);
}

function now() {
  return new Date().toISOString();
}

function encryptBindingData(input: {
  gameId: string;
  playerId: string;
  telegramUserId: string;
  chatId: string;
  telegramUsername?: string;
}): TelegramBindingRecord {
  const timestamp = now();

  return {
    id: `tgbind_${crypto.randomUUID().slice(0, 8)}`,
    gameId: input.gameId,
    playerId: input.playerId,
    createdAt: timestamp,
    updatedAt: timestamp,
    boundAt: timestamp,
    encryptedTelegramUserId: encryptTelegramValue(input.telegramUserId),
    encryptedChatId: encryptTelegramValue(input.chatId),
    encryptedTelegramUsername: input.telegramUsername
      ? encryptTelegramValue(input.telegramUsername)
      : undefined,
    encryptedTelegramUserHash: encryptTelegramValue(
      hashTelegramValue(input.telegramUserId),
    ),
    encryptedChatHash: encryptTelegramValue(hashTelegramValue(input.chatId)),
  };
}

function decryptBindingData(record: TelegramBindingRecord): TelegramBinding {
  return {
    id: record.id,
    gameId: record.gameId,
    playerId: record.playerId,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    boundAt: record.boundAt,
    telegramUserId: decryptTelegramValue(record.encryptedTelegramUserId),
    chatId: decryptTelegramValue(record.encryptedChatId),
    telegramUsername: record.encryptedTelegramUsername
      ? decryptTelegramValue(record.encryptedTelegramUsername)
      : undefined,
  };
}

export async function upsertTelegramBinding(input: {
  gameId: string;
  playerId: string;
  telegramUserId: string;
  chatId: string;
  telegramUsername?: string;
}) {
  const existing = await getTelegramBindingRecordByPlayerId(input.playerId);
  const timestamp = now();
  const nextRecord = existing
    ? {
        ...existing,
        gameId: input.gameId,
        updatedAt: timestamp,
        boundAt: timestamp,
        encryptedTelegramUserId: encryptTelegramValue(input.telegramUserId),
        encryptedChatId: encryptTelegramValue(input.chatId),
        encryptedTelegramUsername: input.telegramUsername
          ? encryptTelegramValue(input.telegramUsername)
          : undefined,
        encryptedTelegramUserHash: encryptTelegramValue(
          hashTelegramValue(input.telegramUserId),
        ),
        encryptedChatHash: encryptTelegramValue(hashTelegramValue(input.chatId)),
      }
    : encryptBindingData(input);

  if (resolveGameStorageDriver() === "postgres") {
    await ensureBindingsTable();
    const sql = getSqlClient();

    await sql`
      insert into telegram_bindings (id, game_id, player_id, created_at, updated_at, payload)
      values (
        ${nextRecord.id},
        ${nextRecord.gameId},
        ${nextRecord.playerId},
        ${nextRecord.createdAt},
        ${nextRecord.updatedAt},
        cast(${JSON.stringify(nextRecord)} as jsonb)
      )
      on conflict (player_id) do update set
        game_id = excluded.game_id,
        updated_at = excluded.updated_at,
        payload = excluded.payload
    `;

    return decryptBindingData(nextRecord);
  }

  return runExclusive(async () => {
    const store = await readFilesystemStore();
    store.bindings[nextRecord.playerId] = nextRecord;
    await writeFilesystemStore(store);
    return decryptBindingData(nextRecord);
  });
}

async function getTelegramBindingRecordByPlayerId(playerId: string) {
  if (resolveGameStorageDriver() === "postgres") {
    await ensureBindingsTable();
    const sql = getSqlClient();
    const rows = await sql<TelegramBindingRow[]>`
      select id, game_id, player_id, created_at, updated_at, payload
      from telegram_bindings
      where player_id = ${playerId}
      limit 1
    `;

    return rows[0]?.payload;
  }

  const store = await readFilesystemStore();
  return store.bindings[playerId];
}

export async function getTelegramBindingByPlayerId(playerId: string) {
  const record = await getTelegramBindingRecordByPlayerId(playerId);
  return record ? decryptBindingData(record) : undefined;
}

export async function listTelegramBindingsForGame(gameId: string) {
  if (resolveGameStorageDriver() === "postgres") {
    await ensureBindingsTable();
    const sql = getSqlClient();
    const rows = await sql<TelegramBindingRow[]>`
      select id, game_id, player_id, created_at, updated_at, payload
      from telegram_bindings
      where game_id = ${gameId}
    `;

    return rows.map((row) => decryptBindingData(row.payload));
  }

  const store = await readFilesystemStore();
  return Object.values(store.bindings)
    .filter((binding) => binding.gameId === gameId)
    .map((binding) => decryptBindingData(binding));
}

export async function deleteTelegramBindingsForGame(gameId: string) {
  if (resolveGameStorageDriver() === "postgres") {
    await ensureBindingsTable();
    const sql = getSqlClient();
    await sql`
      delete from telegram_bindings
      where game_id = ${gameId}
    `;
    return;
  }

  await runExclusive(async () => {
    const store = await readFilesystemStore();

    for (const [playerId, binding] of Object.entries(store.bindings)) {
      if (binding.gameId === gameId) {
        delete store.bindings[playerId];
      }
    }

    await writeFilesystemStore(store);
  });
}
