import {
  CreateGameInput,
  Game,
  GameMessage,
  JoinGameInput,
  Player,
  PlayerTrait,
  Quest,
  QuestTagToggle,
  SubmitActivityInput,
  SubmitEvidenceInput,
  ValidateQuestInput,
} from "@/lib/types";
import {
  buildActivityReply,
  buildDayNarration,
  buildFinaleCards,
  getStoryBeat,
  updateTraitsFromSummary,
} from "@/lib/story";
import { drawQuest } from "@/lib/quest-pool";

const AVATAR_KEYS = [
  "tincho",
  "fede",
  "javi",
  "luqui",
  "fer",
  "mauri",
  "seba",
  "flor",
  "ladyboy",
  "policia",
];

const ROLE_TITLES = [
  "Itinerary Boss",
  "Hydration Captain",
  "Chaos Dealer",
  "Neon Diplomat",
  "Aftermovie Director",
  "Street Scout",
  "Backup Menace",
];

function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function createInviteCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function now() {
  return new Date().toISOString();
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function sanitizeTelegramHandle(value?: string) {
  const normalized = value?.trim().replace(/^@/, "") ?? "";
  return normalized ? `@${normalized}` : "";
}

function buildTraits(): Record<PlayerTrait, number> {
  return {
    chaos: 1,
    guardian: 1,
    social: 1,
    chronicler: 1,
    foodie: 1,
    stealth: 1,
  };
}

function diffDaysInclusive(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

function createMessage(
  title: string,
  body: string,
  audience: GameMessage["audience"],
  channel: GameMessage["channel"],
  playerId?: string,
): GameMessage {
  return {
    id: createId("msg"),
    title,
    body,
    audience,
    channel,
    playerId,
    createdAt: now(),
  };
}

function selectAvatar(usedAvatars: string[]) {
  return AVATAR_KEYS.find((avatar) => !usedAvatars.includes(avatar)) ?? AVATAR_KEYS[usedAvatars.length % AVATAR_KEYS.length];
}

function createPlayer(
  name: string,
  telegramHandle: string,
  usedAvatars: string[],
  isHost: boolean,
): Player {
  return {
    id: createId("player"),
    name: toTitleCase(name.trim()),
    telegramHandle: sanitizeTelegramHandle(telegramHandle),
    joinedAt: now(),
    points: 0,
    avatarKey: selectAvatar(usedAvatars),
    roleTitle: isHost ? "Game Instigator" : ROLE_TITLES[usedAvatars.length % ROLE_TITLES.length],
    traits: buildTraits(),
    activities: [],
  };
}

function buildTitle(input: CreateGameInput) {
  return (
    input.title?.trim() ||
    `${toTitleCase(input.groomName.trim())}'s Thailand Bachelor Quest`
  );
}

function assertDateRange(startDate: string, endDate: string) {
  const totalDays = diffDaysInclusive(startDate, endDate);

  if (!Number.isFinite(totalDays) || totalDays < 1) {
    throw new Error("The end date must be on or after the start date.");
  }

  if (totalDays > 14) {
    throw new Error("This MVP supports trips up to 14 days long.");
  }

  return totalDays;
}

function addMessages(game: Game, messages: GameMessage[]) {
  game.messages.push(...messages);
}

function findGroomPlayer(game: Game): Player | undefined {
  const groomNameLower = game.groomName.toLowerCase();
  return game.players.find((p) => p.name.toLowerCase() === groomNameLower);
}

function assignQuest(game: Game, player: Player) {
  const beat = getStoryBeat(game.currentDay, game.totalDays);
  const hostPlayer = game.players.find((p) => p.id === game.hostPlayerId);
  const groomPlayer = findGroomPlayer(game);

  const isGroom = groomPlayer?.id === player.id;
  const isHost = game.hostPlayerId === player.id;

  const usedTexts = new Set(game.usedQuestTexts ?? []);

  const drawn = drawQuest(
    player.name,
    isGroom,
    isHost,
    game.groomName,
    hostPlayer?.name ?? "Host",
    game.currentDay,
    game.totalDays,
    (game.enabledTags ?? []) as import("@/lib/quest-pool").QuestTag[],
    usedTexts,
  );

  // Track raw pool text to avoid repeats across players
  if (!game.usedQuestTexts) game.usedQuestTexts = [];
  game.usedQuestTexts.push(drawn.sourceText);

  const quest: Quest = {
    id: createId("quest"),
    playerId: player.id,
    dayNumber: game.currentDay,
    title: drawn.title,
    brief: drawn.brief,
    evidencePrompt: drawn.evidencePrompt,
    points: drawn.points,
    sceneId: beat.id,
    status: "assigned",
    createdAt: now(),
    validators: [],
    validationVotes: [],
  };

  game.quests.push(quest);

  addMessages(game, [
    createMessage(
      `Day ${game.currentDay} quest for ${player.name}`,
      `${quest.title} worth ${quest.points} points. ${quest.brief}`,
      "player",
      game.accessMode === "telegram" ? "telegram-ready" : "simulator",
      player.id,
    ),
  ]);

  return quest;
}

function createDayStartMessages(game: Game) {
  const beat = getStoryBeat(game.currentDay, game.totalDays);

  addMessages(game, [
    createMessage(
      game.currentDay === 1 ? "Welcome to Thailand" : `Day ${game.currentDay} begins`,
      `${buildDayNarration(game, beat)} Rules reminder: submit what you're doing today, complete your side quest, upload proof, and get two rivals to validate it.`,
      "all",
      game.accessMode === "telegram" ? "telegram-ready" : "simulator",
    ),
    createMessage(
      `Narrator broadcast: ${beat.label}`,
      `${beat.location} is live. ${beat.mood}.`,
      "all",
      "timeline",
    ),
  ]);

  game.players.forEach((player) => {
    assignQuest(game, player);
  });

  game.activeBeatId = beat.id;
}

function chooseValidators(game: Game, playerId: string) {
  const candidates = game.players.filter((player) => player.id !== playerId);

  if (game.accessMode === "simulator") {
    const host = candidates.find((player) => player.id === game.hostPlayerId);
    const everyoneElse = candidates.filter((player) => player.id !== game.hostPlayerId);
    return [host, ...everyoneElse]
      .filter((player): player is Player => Boolean(player))
      .map((player) => player.id);
  }

  return candidates.map((player) => player.id);
}

export function assertCanManageGame(game: Game, playerId?: string) {
  if (game.accessMode === "simulator") {
    return;
  }

  if (playerId === game.hostPlayerId) {
    return;
  }

  throw new Error("Only the host can manage this game.");
}

export function createGame(input: CreateGameInput): Game {
  if (!input.hostName.trim()) {
    throw new Error("The host needs a name.");
  }

  if (!input.groomName.trim()) {
    throw new Error("The groom name is required.");
  }

  if (
    input.accessMode === "telegram" &&
    !sanitizeTelegramHandle(input.telegramHandle)
  ) {
    throw new Error("The host needs a Telegram handle for the web game.");
  }

  const totalDays = assertDateRange(input.startDate, input.endDate);
  const host = createPlayer(
    input.hostName,
    input.telegramHandle ?? "",
    [],
    true,
  );
  const initialBeat = getStoryBeat(1, totalDays);

  const validTags: QuestTagToggle[] = (input.enabledTags ?? []).filter(
    (tag): tag is QuestTagToggle => ["alcohol", "locuras", "vegas"].includes(tag),
  );

  const game: Game = {
    id: createId("game"),
    inviteCode: createInviteCode(),
    title: buildTitle(input),
    groomName: toTitleCase(input.groomName.trim()),
    startDate: input.startDate,
    endDate: input.endDate,
    totalDays,
    accessMode: input.accessMode,
    status: "lobby",
    currentDay: 0,
    activeBeatId: initialBeat.id,
    createdAt: now(),
    updatedAt: now(),
    hostPlayerId: host.id,
    enabledTags: validTags,
    usedQuestTexts: [],
    players: [host],
    quests: [],
    messages: [
      createMessage(
        "Lobby created",
        `${host.name} opened ${buildTitle(input)}. Invite the rest of the crew before the trip goes live.`,
        "all",
        "timeline",
      ),
    ],
    finaleCards: [],
  };

  return game;
}

export function joinGame(game: Game, input: JoinGameInput) {
  if (game.status !== "lobby") {
    throw new Error("Players can only join while the game is still in the lobby.");
  }

  if (!input.name.trim()) {
    throw new Error("The player name is required.");
  }

  if (
    game.accessMode === "telegram" &&
    !sanitizeTelegramHandle(input.telegramHandle)
  ) {
    throw new Error("A Telegram handle is required for the web game.");
  }

  const normalizedName = input.name.trim().toLowerCase();

  if (game.players.some((player) => player.name.toLowerCase() === normalizedName)) {
    throw new Error("That player name is already in the party.");
  }

  const player = createPlayer(
    input.name,
    input.telegramHandle ?? "",
    game.players.map((member) => member.avatarKey),
    false,
  );

  game.players.push(player);
  addMessages(game, [
    createMessage(
      "New party member",
      `${player.name} joined the bachelor-party run${player.telegramHandle ? ` as ${player.telegramHandle}` : ""}.`,
      "all",
      "timeline",
    ),
  ]);

  game.updatedAt = now();
  return { game, player };
}

export function startGame(game: Game) {
  if (game.status !== "lobby") {
    throw new Error("Only lobby games can be started.");
  }

  if (game.players.length < 3) {
    throw new Error("You need at least 3 players so two other people can validate each quest.");
  }

  game.status = "active";
  game.currentDay = 1;
  createDayStartMessages(game);
  game.updatedAt = now();

  return game;
}

export function advanceDay(game: Game) {
  if (game.status !== "active") {
    throw new Error("Only active games can advance.");
  }

  if (game.currentDay >= game.totalDays) {
    return finishGame(game);
  }

  game.currentDay += 1;
  createDayStartMessages(game);
  game.updatedAt = now();

  return game;
}

export function finishGame(game: Game) {
  if (game.status === "finished") {
    return game;
  }

  game.status = "finished";
  game.finaleCards = buildFinaleCards(game);

  const podium = [...game.players]
    .sort((left, right) => right.points - left.points)
    .slice(0, 3)
    .map(
      (player, index) =>
        `#${index + 1} ${player.name} with ${player.points} points`,
    )
    .join(" | ");

  addMessages(game, [
    createMessage(
      "The Legend Board is live",
      `The trip has ended. Final podium: ${podium}. The evidence reel is now official bachelor-party canon.`,
      "all",
      game.accessMode === "telegram" ? "telegram-ready" : "simulator",
    ),
  ]);

  game.updatedAt = now();
  return game;
}

export function resetGame(game: Game) {
  const host = game.players.find((player) => player.id === game.hostPlayerId);
  const initialBeat = getStoryBeat(1, game.totalDays);

  game.status = "lobby";
  game.currentDay = 0;
  game.activeBeatId = initialBeat.id;
  game.quests = [];
  game.finaleCards = [];
  game.usedQuestTexts = [];
  game.players = game.players.map((player) => ({
    ...player,
    points: 0,
    traits: buildTraits(),
    activities: [],
  }));
  game.messages = [
    createMessage(
      "Lobby reset",
      `${host?.name ?? "The host"} reset ${game.title}. The party is back in the lobby and ready for another run.`,
      "all",
      "timeline",
    ),
  ];
  game.updatedAt = now();

  return game;
}

export function submitActivity(
  game: Game,
  playerId: string,
  input: SubmitActivityInput,
) {
  if (game.status !== "active") {
    throw new Error("Activities can only be submitted while the game is active.");
  }

  const player = game.players.find((entry) => entry.id === playerId);

  if (!player) {
    throw new Error("Player not found.");
  }

  if (!input.summary.trim()) {
    throw new Error("Tell the narrator what you are doing first.");
  }

  const existing = player.activities.find(
    (activity) => activity.dayNumber === game.currentDay,
  );

  if (existing) {
    existing.summary = input.summary.trim();
    existing.createdAt = now();
  } else {
    player.activities.push({
      id: createId("activity"),
      dayNumber: game.currentDay,
      summary: input.summary.trim(),
      createdAt: now(),
    });
  }

  player.traits = updateTraitsFromSummary(player.traits, input.summary.trim());

  addMessages(game, [
    createMessage(
      `Narrator note for ${player.name}`,
      buildActivityReply(player, input.summary.trim()),
      "player",
      game.accessMode === "telegram" ? "telegram-ready" : "simulator",
      player.id,
    ),
  ]);

  game.updatedAt = now();
  return game;
}

export function submitEvidence(
  game: Game,
  playerId: string,
  questId: string,
  input: SubmitEvidenceInput,
) {
  const quest = game.quests.find((entry) => entry.id === questId);

  if (!quest || quest.playerId !== playerId) {
    throw new Error("Quest not found for this player.");
  }

  if (quest.status === "completed") {
    throw new Error("That quest has already been completed.");
  }

  if (!input.description.trim()) {
    throw new Error("Add a short description for the proof.");
  }

  if (!input.assetUrl.trim()) {
    throw new Error("Evidence needs either an upload or a proof URL.");
  }

  quest.evidence = {
    kind: input.kind,
    description: input.description.trim(),
    assetUrl: input.assetUrl.trim(),
    fileName: input.fileName,
    submittedAt: now(),
  };
  quest.status = "pending_validation";
  quest.validators = chooseValidators(game, playerId);
  quest.validationVotes = [];

  const owner = game.players.find((player) => player.id === playerId);

  addMessages(game, [
    createMessage(
      `${owner?.name}'s proof is ready`,
      `${owner?.name} submitted evidence for ${quest.title}. Validators: ${quest.validators
        .map((validatorId) => game.players.find((player) => player.id === validatorId)?.name)
        .filter(Boolean)
        .join(", ")}.`,
      "all",
      "timeline",
    ),
    ...quest.validators.map((validatorId) =>
      createMessage(
        `Validate ${owner?.name}'s quest`,
        `${owner?.name} claims they completed "${quest.title}". Review the evidence and vote.`,
        "player",
        game.accessMode === "telegram" ? "telegram-ready" : "simulator",
        validatorId,
      ),
    ),
  ]);

  game.updatedAt = now();
  return game;
}

export function validateQuest(
  game: Game,
  validatorId: string,
  questId: string,
  input: ValidateQuestInput,
) {
  const quest = game.quests.find((entry) => entry.id === questId);

  if (!quest) {
    throw new Error("Quest not found.");
  }

  if (quest.status !== "pending_validation") {
    throw new Error("That quest is no longer waiting for validation.");
  }

  if (quest.playerId === validatorId) {
    throw new Error("You cannot validate your own quest.");
  }

  if (
    quest.validationVotes.some((vote) => vote.playerId === validatorId)
  ) {
    throw new Error("This validator already voted.");
  }

  quest.validationVotes.push({
    playerId: validatorId,
    decision: input.decision,
    note: input.note.trim(),
    createdAt: now(),
  });

  const questOwner = game.players.find((player) => player.id === quest.playerId);
  const validator = game.players.find((player) => player.id === validatorId);

  if (input.decision === "rejected") {
    quest.status = "rejected";
    addMessages(game, [
      createMessage(
        "Quest rejected",
        `${validator?.name} rejected ${questOwner?.name}'s proof for "${quest.title}". No points were awarded and the crew saw the ruling.`,
        "all",
        game.accessMode === "telegram" ? "telegram-ready" : "simulator",
      ),
    ]);
  } else {
    quest.status = "completed";
    quest.awardedAt = now();

    if (questOwner) {
      questOwner.points += quest.points;
    }

    addMessages(game, [
      createMessage(
        "Quest completed",
        `${validator?.name} approved ${questOwner?.name}'s proof for "${quest.title}". ${questOwner?.name} banked ${quest.points} points.`,
        "all",
        game.accessMode === "telegram" ? "telegram-ready" : "simulator",
      ),
    ]);
  }

  game.updatedAt = now();
  return game;
}
