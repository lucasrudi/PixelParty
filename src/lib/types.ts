export type GameStatus = "lobby" | "active" | "finished";

export type AccessMode = "telegram" | "simulator";

export type PlayerTrait =
  | "chaos"
  | "guardian"
  | "social"
  | "chronicler"
  | "foodie"
  | "stealth";

export type ValidationDecision = "approved" | "rejected";

export type QuestStatus =
  | "assigned"
  | "pending_validation"
  | "completed"
  | "rejected";

export type EvidenceKind = "photo" | "video";

export const EVIDENCE_KINDS = ["photo", "video"] as const;
export const MAX_EVIDENCE_DESCRIPTION_LENGTH = 500;
export const MAX_EVIDENCE_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024;
export const MAX_EVIDENCE_REQUEST_SIZE_BYTES = 10 * 1024 * 1024;
export const MAX_EVIDENCE_URL_LENGTH = 2048;

export function isEvidenceKind(value: string): value is EvidenceKind {
  return EVIDENCE_KINDS.includes(value as EvidenceKind);
}

export type MessageAudience = "all" | "player";

export interface PlayerActivity {
  id: string;
  dayNumber: number;
  summary: string;
  createdAt: string;
}

export interface ValidationVote {
  playerId: string;
  decision: ValidationDecision;
  note: string;
  createdAt: string;
}

export interface QuestEvidence {
  kind: EvidenceKind;
  description: string;
  assetUrl: string;
  fileName?: string;
  submittedAt: string;
}

export interface Quest {
  id: string;
  playerId: string;
  dayNumber: number;
  title: string;
  brief: string;
  evidencePrompt: string;
  points: number;
  sceneId: string;
  status: QuestStatus;
  createdAt: string;
  validators: string[];
  validationVotes: ValidationVote[];
  evidence?: QuestEvidence;
  awardedAt?: string;
}

export interface Player {
  id: string;
  name: string;
  telegramHandle: string;
  telegramUserId?: string;
  telegramVerifiedAt?: string;
  telegramBindingToken?: string;
  telegramChatId?: string;
  joinedAt: string;
  points: number;
  avatarKey: string;
  roleTitle: string;
  traits: Record<PlayerTrait, number>;
  activities: PlayerActivity[];
}

export interface StoryBeat {
  id: string;
  label: string;
  location: string;
  mood: string;
  backdrop: string;
  narratorLead: string;
  flavor: string[];
}

export interface GameMessage {
  id: string;
  audience: MessageAudience;
  playerId?: string;
  channel: "telegram-ready" | "simulator" | "timeline";
  title: string;
  body: string;
  createdAt: string;
  telegramDeliveredTo?: string[];
}

export interface FinaleCard {
  playerId: string;
  title: string;
  description: string;
}

export type QuestTagToggle = "alcohol" | "locuras" | "vegas";

export interface JoinedGameSummary {
  accessMode: AccessMode;
  currentDay: number;
  endDate: string;
  gameId: string;
  hostName: string;
  joinedAt: string;
  playerId: string;
  playerName: string;
  startDate: string;
  status: GameStatus;
  title: string;
  totalDays: number;
  updatedAt: string;
}

export interface Game {
  id: string;
  inviteCode: string;
  title: string;
  groomName: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  accessMode: AccessMode;
  status: GameStatus;
  currentDay: number;
  activeBeatId: string;
  createdAt: string;
  updatedAt: string;
  hostPlayerId: string;
  enabledTags: QuestTagToggle[];
  usedQuestTexts: string[];
  players: Player[];
  quests: Quest[];
  messages: GameMessage[];
  finaleCards: FinaleCard[];
}

export interface CreateGameInput {
  title?: string;
  groomName: string;
  startDate: string;
  endDate: string;
  hostName: string;
  telegramHandle?: string;
  telegramUserId?: string;
  telegramVerifiedAt?: string;
  telegramChatId?: string;
  accessMode: AccessMode;
  enabledTags?: QuestTagToggle[];
}

export interface JoinGameInput {
  name: string;
  telegramHandle?: string;
  telegramUserId?: string;
  telegramVerifiedAt?: string;
  telegramChatId?: string;
}

export interface SubmitActivityInput {
  summary: string;
}

export interface SubmitEvidenceInput {
  description: string;
  kind: EvidenceKind;
  assetUrl: string;
  fileName?: string;
}

export interface ValidateQuestInput {
  decision: ValidationDecision;
  note: string;
}
