/**
 * Bachelor-party quest pool adapted from Plot Twist.
 *
 * Each quest has:
 *  - text: the quest description with interpolation placeholders
 *  - level: 1-5 (escalating intensity)
 *  - tags: filter toggles ("alcohol", "locuras", "vegas")
 *  - target: who receives the quest ("groom", "host", "any", "all")
 *
 * Placeholders replaced at draw time:
 *  - {groom}  → game.groomName
 *  - {host}   → host player name
 *  - {player} → assigned player name
 */

export type QuestTag = "alcohol" | "locuras" | "vegas";
export type QuestTarget = "groom" | "host" | "any" | "all";

export interface PoolQuest {
  text: string;
  level: number;
  tags: QuestTag[];
  target: QuestTarget;
}

export const BACHELOR_QUEST_POOL: PoolQuest[] = [
  // ── LEVEL 1: Warming Up (7) ──
  { text: "Get 3 strangers to record a 10-second video giving {groom} their best marriage advice. The more dramatic, the better", level: 1, tags: [], target: "any" },
  { text: "{groom}, tell the group how you met your partner, but exaggerate it until it sounds like an action movie. Group rates the performance", level: 1, tags: [], target: "groom" },
  { text: "{host}, present the group a top 3 of {groom}'s worst life decisions. They can defend themselves, but the group judges", level: 1, tags: [], target: "host" },
  { text: "Everyone records a 15-second audio with a wish for {groom}. Save them all to play at the wedding", level: 1, tags: [], target: "all" },
  { text: "Take the most epic candid photo of {groom} tonight. No posing, no warning. Most ridiculous spontaneous shot wins", level: 1, tags: [], target: "any" },
  { text: "Get a stranger to give {groom} a bear hug and say 'you're going to be fine'. No context whatsoever", level: 1, tags: [], target: "any" },
  { text: "{player}, do your best impression of {groom} at their most typical moment. Group votes if the character is recognisable", level: 1, tags: [], target: "any" },

  // ── LEVEL 2: Getting Into It (8) ──
  { text: "{host}, run a quick 5-round 'Never Have I Ever'. Every statement must be about {groom}. They always drink (or do a forfeit)", level: 2, tags: [], target: "host" },
  { text: "Convince someone at another table to pretend to be a wedding witness for 3 minutes. They must deliver an improvised speech about {groom}", level: 2, tags: [], target: "any" },
  { text: "{player}, make a quick phone collage of {groom}'s most disastrous photos. Show a stranger and ask them to pick the worst one", level: 2, tags: [], target: "any" },
  { text: "Create a 5-question marriage aptitude test and give it to {groom} in front of everyone. If they fail, they owe the group a round of applause", level: 2, tags: [], target: "any" },
  { text: "{host}, interview 3 people in the group about their WORST memory with {groom}. Film it like a serious documentary", level: 2, tags: [], target: "host" },
  { text: "Walk up to another table claiming to be {groom}'s wedding planner. Ask for serious opinions on a completely made-up wedding dilemma", level: 2, tags: [], target: "any" },
  { text: "{player}, write wedding vows on behalf of {groom}. Read them aloud in front of the group. They must clap", level: 2, tags: [], target: "any" },
  { text: "{groom}, 2-minute stand-up about the most embarrassing story from your relationship. If your partner found out, would they forgive you? The group decides", level: 2, tags: [], target: "groom" },

  // ── LEVEL 3: The Night Gets Good (10) ──
  { text: "Do a 90-second roast of {groom} using only real facts. No mercy, no filter. If people don't laugh, it doesn't count", level: 3, tags: [], target: "any" },
  { text: "{groom}, dare yourself to ask the bartender for the strongest thing they've got and drink it with a straight face. Film everything", level: 3, tags: ["alcohol"], target: "groom" },
  { text: "{host}, organise a round of shots. But before each one, the drinker has to say something {groom} should stop doing before getting married", level: 3, tags: ["alcohol"], target: "host" },
  { text: "Film a fake movie trailer about {groom}'s life with the whole group as actors. Minimum 45 seconds, mouth sound effects mandatory", level: 3, tags: [], target: "all" },
  { text: "{player}, dare {groom} to get 3 strangers' phone numbers in 10 minutes. With consent. Each miss = a forfeit", level: 3, tags: [], target: "any" },
  { text: "Get the entire bar to sing something to {groom}. Happy birthday is banned. Has to be a love song or a farewell anthem", level: 3, tags: [], target: "any" },
  { text: "{groom}, play bartender for a round: invent a cocktail from whatever's available, name it, and serve everyone. Group rates taste and creativity", level: 3, tags: ["alcohol"], target: "groom" },
  { text: "{host}, deliver your best man/maid of honour speech RIGHT NOW. Like it's the wedding. 2 minutes minimum. If someone tears up, double points", level: 3, tags: [], target: "host" },
  { text: "Set up a courtroom: {groom} is the defendant. Charges: crimes against bachelorhood. Prosecutor, defence, and bar jury. Minimum 3 minutes", level: 3, tags: [], target: "all" },
  { text: "Give {groom} a compatibility test: a stranger asks 5 questions and rates their marriage-readiness from 1 to 10", level: 3, tags: [], target: "any" },

  // ── LEVEL 4: No Brakes (10) ──
  { text: "{player}, invent a 4-step dance and teach it to the whole group. {groom} must nail it perfectly or redo it until they do", level: 4, tags: ["locuras"], target: "any" },
  { text: "{host}, organise a 'public trial' for {groom} with a jury of strangers. Increasingly ridiculous charges. Minimum 5 minutes", level: 4, tags: ["locuras"], target: "host" },
  { text: "Climb on something elevated in the bar and give a 1-minute speech about why {groom} is the best person you know. No irony, full volume, full commitment", level: 4, tags: ["locuras"], target: "any" },
  { text: "{groom}, swap phones with {host} for 10 minutes. You can send messages, change photos, whatever. Nothing gets undone after", level: 4, tags: ["locuras"], target: "groom" },
  { text: "Build an ironic shrine to {groom} on a bar table: glasses, napkins, straws, whatever. Get at least 3 strangers to pay tribute", level: 4, tags: ["locuras"], target: "any" },
  { text: "Truth shots round: before each drink, everyone reveals something they think about {groom} but never said. Only truth. No sugarcoating", level: 4, tags: ["locuras", "alcohol"], target: "all" },
  { text: "{player}, get a complete stranger to deliver an improvised best man/maid of honour speech about {groom} for 2 minutes. Must genuinely move or crack up the room", level: 4, tags: ["locuras"], target: "any" },
  { text: "{groom}, public karaoke. The group picks the most ridiculous song possible. No negotiating, no escaping. Sing the ENTIRE thing", level: 4, tags: ["locuras"], target: "groom" },
  { text: "{host}, direct a 90-second short film about 'the last night of freedom' with the whole group acting. {groom} is the lead", level: 4, tags: ["locuras"], target: "host" },
  { text: "The group assigns {groom} 3 quick challenges at the bar. Complete 2 of 3 and the group covers the next round. Fail and {groom} gives a thank-you speech to each person", level: 4, tags: ["locuras"], target: "all" },

  // ── LEVEL 5: What Happens Here, Stays Here (4) ──
  { text: "{groom}, merciless roast: everyone gets 60 seconds to destroy you with real facts. No limits. You just listen. At the end, you get one comeback per person", level: 5, tags: ["vegas"], target: "groom" },
  { text: "Everyone writes a secret about {groom} on paper. Anonymous. Read them all aloud. {groom} has to guess who wrote each one", level: 5, tags: ["vegas"], target: "all" },
  { text: "{host}, organise the final test: {groom} has 5 minutes to convince the group they deserve to get married. If the group doesn't say 'yes', repeat until they do", level: 5, tags: ["vegas"], target: "host" },
  { text: "{groom}, call your partner RIGHT NOW, put them on speaker, and tell them the 3 things that scare you most about marriage. The group listens in silence", level: 5, tags: ["vegas"], target: "groom" },
];

const POINTS_BY_LEVEL: Record<number, number> = {
  1: 40,
  2: 60,
  3: 80,
  4: 100,
  5: 150,
};

/**
 * Filter the pool by enabled tags and day-appropriate levels.
 * Vegas quests only appear in the last third of the trip.
 */
function filterPool(
  enabledTags: QuestTag[],
  dayNumber: number,
  totalDays: number,
): PoolQuest[] {
  const tagSet = new Set(enabledTags);
  const isLastThird = dayNumber >= Math.ceil(totalDays * 0.67);

  return BACHELOR_QUEST_POOL.filter((quest) => {
    // Every tag on the quest must be enabled
    if (quest.tags.some((tag) => !tagSet.has(tag))) {
      return false;
    }

    // Vegas quests only in the last third of the trip
    if (quest.tags.includes("vegas") && !isLastThird) {
      return false;
    }

    return true;
  });
}

/**
 * Map day number to preferred quest levels.
 * Early days → lower levels, later days → higher levels.
 */
function levelsForDay(dayNumber: number, totalDays: number): number[] {
  const progress = totalDays <= 1 ? 0.5 : (dayNumber - 1) / (totalDays - 1);

  if (progress <= 0.25) return [1, 2];
  if (progress <= 0.5) return [2, 3];
  if (progress <= 0.75) return [3, 4];
  return [4, 5];
}

/**
 * Interpolate placeholders in quest text.
 */
function interpolate(
  text: string,
  groomName: string,
  hostName: string,
  playerName: string,
): string {
  return text
    .replace(/\{groom\}/g, groomName)
    .replace(/\{host\}/g, hostName)
    .replace(/\{player\}/g, playerName);
}

/**
 * Deterministic-ish shuffle seeded by a string.
 * Good enough for quest variety without needing crypto.
 */
function seededShuffle<T>(items: T[], seed: string): T[] {
  const result = [...items];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }

  for (let i = result.length - 1; i > 0; i--) {
    hash = ((hash << 5) - hash + i) | 0;
    const j = Math.abs(hash) % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export interface DrawnQuest {
  title: string;
  brief: string;
  evidencePrompt: string;
  points: number;
  /** Raw pool text before interpolation — used for dedup tracking */
  sourceText: string;
}

/**
 * Select a quest for a specific player from the pool.
 *
 * - Filters by enabled tags and day-appropriate levels
 * - Matches target to the player's role (groom, host, or any)
 * - Avoids quests already used in usedTexts
 * - Falls back to "any" target quests if no role-specific match
 */
export function drawQuest(
  playerName: string,
  isGroom: boolean,
  isHost: boolean,
  groomName: string,
  hostName: string,
  dayNumber: number,
  totalDays: number,
  enabledTags: QuestTag[],
  usedTexts: Set<string>,
): DrawnQuest {
  const pool = filterPool(enabledTags, dayNumber, totalDays);
  const preferredLevels = levelsForDay(dayNumber, totalDays);

  // Determine which targets this player can receive
  const validTargets: QuestTarget[] = ["any", "all"];
  if (isGroom) validTargets.push("groom");
  if (isHost) validTargets.push("host");

  // Prefer quests at the right level for this day
  const preferred = pool.filter(
    (q) => preferredLevels.includes(q.level) && validTargets.includes(q.target) && !usedTexts.has(q.text),
  );

  // Broader fallback: any level, right target
  const fallback = pool.filter(
    (q) => validTargets.includes(q.target) && !usedTexts.has(q.text),
  );

  // Last resort: anything unused
  const lastResort = pool.filter((q) => !usedTexts.has(q.text));

  const seed = `${playerName}-${dayNumber}-${totalDays}`;
  const candidates = preferred.length > 0
    ? seededShuffle(preferred, seed)
    : fallback.length > 0
      ? seededShuffle(fallback, seed)
      : lastResort.length > 0
        ? seededShuffle(lastResort, seed)
        : seededShuffle(pool, seed); // all used up, allow repeats

  const quest = candidates[0];
  const text = interpolate(quest.text, groomName, hostName, playerName);
  const points = POINTS_BY_LEVEL[quest.level] ?? 60;

  // Generate a short title from the quest level and target
  const titlePrefix = quest.target === "all" ? "Group Challenge" : "Side Quest";
  const levelLabel = ["", "Warm-Up", "Mid-Game", "Heat Check", "No Brakes", "Vegas Rules"][quest.level] ?? "";

  return {
    title: `${titlePrefix}: ${levelLabel}`,
    brief: text,
    evidencePrompt: "Photo or video proof so the crew can validate it.",
    points,
    sourceText: quest.text,
  };
}
