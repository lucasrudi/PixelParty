import { Game, Player, PlayerTrait, StoryBeat } from "@/lib/types";

const STORY_BEATS: StoryBeat[] = [
  {
    id: "wheels-up",
    label: "Wheels Up",
    location: "Ezeiza to Bangkok",
    mood: "Pre-flight chaos",
    backdrop: "/pixelforge/backgrounds/bg_airplane.png",
    narratorLead:
      "The bachelor crew has cleared security, spotted the duty free, and immediately made that everyone else's problem.",
    flavor: [
      "A mysterious bucket list appears folded inside a boarding pass.",
      "Somebody claims airline whiskey counts as hydration.",
      "The narrator can already smell terrible decisions at cruising altitude.",
    ],
  },
  {
    id: "basecamp",
    label: "Base Camp",
    location: "Bangkok Hotel",
    mood: "Poolside plotting",
    backdrop: "/pixelforge/backgrounds/bg_hotel.png",
    narratorLead:
      "The crew hits Bangkok and turns the hotel lobby into a war room for the night's mayhem.",
    flavor: [
      "The minibar has been profiled as a hostile witness.",
      "Someone is already wearing a TEAM GROOM wristband with far too much confidence.",
      "A 7-Eleven snack run is the only thing preventing total collapse.",
    ],
  },
  {
    id: "khaosan",
    label: "Khao San Raid",
    location: "Khao San Road",
    mood: "Neon fever",
    backdrop: "/pixelforge/backgrounds/bg_khaosan.png",
    narratorLead:
      "Buckets are sloshing, DJs are shouting, and the street feels like it was procedurally generated from chaos itself.",
    flavor: [
      "The soundtrack is a collision between Eurodance and one bad idea after another.",
      "A stranger insists this night becomes legendary only if someone ends up on stage.",
      "The narrator would like the record to show that nobody is behaving responsibly.",
    ],
  },
  {
    id: "soi-six",
    label: "Neon Gauntlet",
    location: "Soi 6",
    mood: "Side-eye and survival",
    backdrop: "/pixelforge/backgrounds/bg_soi6.png",
    narratorLead:
      "The street narrows, the lights go louder, and every doorway feels like a side quest waiting to ambush the party.",
    flavor: [
      "Every five meters someone says, 'Trust me, I know a shortcut.'",
      "The group walks in a loose diamond formation that fools absolutely nobody.",
      "Even the tuk-tuks seem judgmental tonight.",
    ],
  },
  {
    id: "redemption",
    label: "Sunrise Recovery",
    location: "Bangkok Morning",
    mood: "Soft reset",
    backdrop: "/pixelforge/backgrounds/bg_airport.png",
    narratorLead:
      "Morning hits with brutal honesty, but the party has just enough dignity left for one more comeback arc.",
    flavor: [
      "Electrolytes become the hottest currency in Thailand.",
      "Someone swears the hotel breakfast cured a spiritual crisis.",
      "The groom starts looking suspiciously heroic again.",
    ],
  },
  {
    id: "grand-finale",
    label: "Legend Board",
    location: "Final Reveal",
    mood: "Glory and receipts",
    backdrop: "/pixelforge/backgrounds/bg_church.png",
    narratorLead:
      "The narrator rolls out the final scoreboard, the proof gallery, and the titles nobody can ever live down.",
    flavor: [
      "Every validated quest becomes part of bachelor-party folklore.",
      "The group chat will never emotionally recover from the evidence reel.",
      "This is where legends are crowned and alibis die.",
    ],
  },
];

const TRAIT_KEYWORDS: Record<PlayerTrait, string[]> = {
  chaos: ["shot", "dance", "bucket", "bar", "party", "dj", "beer", "club"],
  guardian: ["water", "hydrate", "help", "taxi", "safe", "rest", "break"],
  social: ["stranger", "friend", "group", "met", "chat", "local", "dj"],
  chronicler: ["photo", "video", "selfie", "film", "record", "camera"],
  foodie: ["food", "noodle", "pad thai", "snack", "eat", "restaurant"],
  stealth: ["quiet", "sneak", "escape", "hidden", "shortcut", "mission"],
};

const TRAIT_TITLES: Record<PlayerTrait, string> = {
  chaos: "Chaos Baron",
  guardian: "Hydration Saint",
  social: "Mayor of Khao San",
  chronicler: "Content Goblin",
  foodie: "Street Food Oracle",
  stealth: "Soi 6 Shadow",
};

const QUEST_BANK: Record<
  PlayerTrait,
  { title: string; brief: string; evidencePrompt: string }[]
> = {
  chaos: [
    {
      title: "Neon Instigator",
      brief:
        "Convince the crew to commit to one wildly unnecessary but harmless group moment that upgrades the night's energy.",
      evidencePrompt:
        "Capture the before-and-after vibe so the narrator can verify the chaos landed.",
    },
    {
      title: "Bucket Diplomacy",
      brief:
        "Broker a truce between two conflicting plans and turn it into one iconic party move.",
      evidencePrompt:
        "Show the crew united around the final nonsense that won the vote.",
    },
  ],
  guardian: [
    {
      title: "Guardian Angel Shift",
      brief:
        "Keep one teammate functional with water, food, or a tactical extraction before the night gets stupid.",
      evidencePrompt:
        "Show the rescue in progress and name the teammate you saved from disaster.",
    },
    {
      title: "Morning Recovery Kit",
      brief:
        "Assemble the ultimate hangover survival bundle for the crew before sunrise hits.",
      evidencePrompt:
        "Capture the kit and the grateful faces of the people it saved.",
    },
  ],
  social: [
    {
      title: "NPC Recruiter",
      brief:
        "Make one memorable connection with a local or fellow traveler and earn a story worth retelling tomorrow.",
      evidencePrompt:
        "Show the encounter and write down the best travel wisdom you picked up.",
    },
    {
      title: "Table for Legends",
      brief:
        "Turn a random social moment into a group-wide event that pulls more people into the party orbit.",
      evidencePrompt:
        "Capture the expanded crew and explain how the social combo happened.",
    },
  ],
  chronicler: [
    {
      title: "Receipt Collector",
      brief:
        "Document a scene that perfectly captures the night's absurdity without breaking the vibe.",
      evidencePrompt:
        "Upload the cleanest proof that this moment belonged in the trailer.",
    },
    {
      title: "Bachelor Correspondent",
      brief:
        "Build a mini highlight reel of the group's current saga from one strong visual beat.",
      evidencePrompt:
        "Show the frame and explain why it deserves narrator airtime.",
    },
  ],
  foodie: [
    {
      title: "Street Food Scout",
      brief:
        "Find the most suspiciously delicious snack of the day and make the group brave enough to try it.",
      evidencePrompt:
        "Capture the snack, the tasting face, and the verdict from the crew.",
    },
    {
      title: "Midnight Fuel Run",
      brief:
        "Secure emergency food that keeps the party from crashing at the worst possible moment.",
      evidencePrompt:
        "Show the haul and explain how it changed the group's trajectory.",
    },
  ],
  stealth: [
    {
      title: "Stealth Navigator",
      brief:
        "Guide the crew through one chaotic stretch of the city without losing a teammate or a sandal.",
      evidencePrompt:
        "Capture the safe checkpoint and tell the narrator what danger you dodged.",
    },
    {
      title: "Exit Strategy",
      brief:
        "Spot the exact moment a tactical retreat becomes the smartest play on the street.",
      evidencePrompt:
        "Show the extraction route and why your timing was elite.",
    },
  ],
};

export function getStoryBeat(dayNumber: number, totalDays: number): StoryBeat {
  if (dayNumber <= 1) {
    return STORY_BEATS[0];
  }

  if (dayNumber >= totalDays) {
    return STORY_BEATS[STORY_BEATS.length - 1];
  }

  const middle = STORY_BEATS.slice(1, STORY_BEATS.length - 1);
  return middle[(dayNumber - 2) % middle.length];
}

export function listStoryBeats(totalDays: number): StoryBeat[] {
  return Array.from({ length: totalDays }, (_, index) =>
    getStoryBeat(index + 1, totalDays),
  );
}

export function detectDominantTrait(player: Player): PlayerTrait {
  return (Object.entries(player.traits).sort((left, right) => {
    if (right[1] === left[1]) {
      return left[0].localeCompare(right[0]);
    }

    return right[1] - left[1];
  })[0]?.[0] ?? "social") as PlayerTrait;
}

export function updateTraitsFromSummary(
  currentTraits: Player["traits"],
  summary: string,
): Player["traits"] {
  const nextTraits = { ...currentTraits };
  const normalized = summary.toLowerCase();

  (Object.entries(TRAIT_KEYWORDS) as [PlayerTrait, string[]][]).forEach(
    ([trait, keywords]) => {
      const matches = keywords.reduce((count, keyword) => {
        return count + (normalized.includes(keyword) ? 1 : 0);
      }, 0);

      if (matches > 0) {
        nextTraits[trait] += matches;
      }
    },
  );

  return nextTraits;
}

export function buildQuestForPlayer(
  player: Player,
  dayNumber: number,
  totalDays: number,
): {
  title: string;
  brief: string;
  evidencePrompt: string;
  points: number;
  dominantTrait: PlayerTrait;
} {
  const dominantTrait = detectDominantTrait(player);
  const options = QUEST_BANK[dominantTrait];
  const seed = (player.name.length + dayNumber + totalDays) % options.length;
  const selected = options[seed];
  const points = 45 + dayNumber * 35 + player.activities.length * 10;

  return {
    ...selected,
    points,
    dominantTrait,
  };
}

export function buildDayNarration(game: Game, beat: StoryBeat): string {
  const leader = [...game.players].sort((left, right) => right.points - left.points)[0];
  const leaderLine = leader
    ? `${leader.name} currently holds the bragging rights with ${leader.points} points.`
    : "The board is clean and anyone can become the trip legend.";

  return `${beat.narratorLead} ${beat.flavor[game.currentDay % beat.flavor.length]} ${leaderLine}`;
}

export function buildActivityReply(player: Player, summary: string): string {
  const normalized = summary.toLowerCase();
  const dominantTrait = detectDominantTrait(player);

  if (normalized.includes("water") || normalized.includes("food")) {
    return `${player.name} is quietly becoming the reason this group survives tomorrow. The narrator respects the logistics.`;
  }

  if (normalized.includes("photo") || normalized.includes("video")) {
    return `${player.name} is collecting receipts with dangerous efficiency. Future blackmail value has increased.`;
  }

  return `${player.name} is leaning into their ${TRAIT_TITLES[dominantTrait]} arc. The narrator is adjusting tomorrow's trouble accordingly.`;
}

export function buildFinaleCards(game: Game) {
  return game.players
    .map((player) => {
      const dominantTrait = detectDominantTrait(player);
      const completedQuests = game.quests.filter(
        (quest) => quest.playerId === player.id && quest.status === "completed",
      ).length;

      return {
        playerId: player.id,
        title: TRAIT_TITLES[dominantTrait],
        description: `${player.name} finished with ${player.points} points and ${completedQuests} validated quest${completedQuests === 1 ? "" : "s"}.`,
      };
    })
    .sort((left, right) => {
      const leftPlayer = game.players.find((player) => player.id === left.playerId);
      const rightPlayer = game.players.find((player) => player.id === right.playerId);

      return (rightPlayer?.points ?? 0) - (leftPlayer?.points ?? 0);
    });
}
