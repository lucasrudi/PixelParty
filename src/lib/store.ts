import { promises as fs } from "fs";
import path from "path";
import { Game } from "@/lib/types";

interface StoreShape {
  games: Record<string, Game>;
}

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "games.json");
let storeQueue = Promise.resolve();

async function ensureStore() {
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

export async function readStore(): Promise<StoreShape> {
  await ensureStore();
  const raw = await fs.readFile(STORE_FILE, "utf8");
  return JSON.parse(raw) as StoreShape;
}

export async function writeStore(store: StoreShape) {
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

export async function listGames() {
  const store = await readStore();
  return Object.values(store.games).sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

export async function getGame(gameId: string) {
  const store = await readStore();
  return store.games[gameId];
}

export async function getGameByInvite(inviteCode: string) {
  const store = await readStore();
  return Object.values(store.games).find(
    (game) => game.inviteCode.toLowerCase() === inviteCode.toLowerCase(),
  );
}

export async function saveGame(game: Game) {
  return runExclusive(async () => {
    const store = await readStore();
    store.games[game.id] = game;
    await writeStore(store);
    return game;
  });
}

export async function updateGame(
  gameId: string,
  updater: (game: Game) => Game,
) {
  return runExclusive(async () => {
    const store = await readStore();
    const game = store.games[gameId];

    if (!game) {
      throw new Error("Game not found.");
    }

    store.games[gameId] = updater(structuredClone(game));
    await writeStore(store);
    return store.games[gameId];
  });
}

export async function deleteGame(gameId: string) {
  return runExclusive(async () => {
    const store = await readStore();

    if (!store.games[gameId]) {
      throw new Error("Game not found.");
    }

    delete store.games[gameId];
    await writeStore(store);
  });
}
