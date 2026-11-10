import { MapDifficulty } from "../schemas/map/map-difficulty";

export type Difficulty = {
  id: string;

  mapDifficulty: MapDifficulty;

  displayName?: string;

  shortName: string;

  color: string;

  scoresaberDiffId: number;
};

const difficulties: Difficulty[] = [
  { id: "easy", mapDifficulty: "Easy", shortName: "E", color: "var(--easy)", scoresaberDiffId: 1 },
  { id: "normal", mapDifficulty: "Normal", shortName: "N", color: "var(--normal)", scoresaberDiffId: 3 },
  { id: "hard", mapDifficulty: "Hard", shortName: "H", color: "var(--hard)", scoresaberDiffId: 5 },
  { id: "expert", mapDifficulty: "Expert", shortName: "Ex", color: "var(--expert)", scoresaberDiffId: 7 },
  {
    id: "expertplus",
    mapDifficulty: "ExpertPlus",
    displayName: "Expert+",
    shortName: "E+",
    color: "var(--expertPlus)",
    scoresaberDiffId: 9,
  },
];

export type ScoreBadge = {
  name: string;
  min: number | null;
  max: number | null;
  color: string;
  textColor?: string;
};

// Accuracy tiers are ordinal, so they use their own "rarity" ramp (see themes.css) rather than the
// categorical difficulty colors. Each tier color is readable both as text and as a tint.
const scoreBadges: ScoreBadge[] = [
  { name: "GOD", min: 98, max: null, color: "var(--acc-god)", textColor: "var(--acc-god)" },
  { name: "SS+", min: 95, max: 98, color: "var(--acc-ss-plus)", textColor: "var(--acc-ss-plus)" },
  { name: "SS", min: 90, max: 95, color: "var(--acc-ss)", textColor: "var(--acc-ss)" },
  { name: "S+", min: 85, max: 90, color: "var(--acc-s-plus)", textColor: "var(--acc-s-plus)" },
  { name: "S", min: 80, max: 85, color: "var(--acc-s)", textColor: "var(--acc-s)" },
  { name: "A", min: 70, max: 80, color: "var(--acc-a)", textColor: "var(--acc-a)" },
  { name: "-", min: null, max: 70, color: "var(--acc-none)", textColor: "var(--acc-none)" },
];

export function getScoreBadgeFromAccuracy(acc: number): ScoreBadge {
  for (const badge of scoreBadges) {
    // Badge with no upper limit (SS++, SS+)
    if (badge.max === null && badge.min !== null) {
      if (acc >= badge.min) {
        return badge;
      }
    }
    // Badge with no lower limit ("-")
    else if (badge.min === null && badge.max !== null) {
      if (acc < badge.max) {
        return badge;
      }
    }
    // Badge with both min and max (SS, S+, S, A)
    else if (badge.min !== null && badge.max !== null) {
      if (acc >= badge.min && acc < badge.max) {
        return badge;
      }
    }
  }

  // Fallback color if no badge matches (should not happen)
  return scoreBadges[scoreBadges.length - 1];
}

export function getScoreBadgeFromName(name: string): ScoreBadge {
  return scoreBadges.find(badge => badge.name === name)!;
}

export function getDifficultyName(diff: Difficulty | MapDifficulty) {
  const difficulty = getDifficulty(diff);
  return difficulty.displayName ?? difficulty.mapDifficulty;
}

export function getDifficulty(diff: Difficulty | MapDifficulty) {
  const difficulty = difficulties.find(
    d => d.id === (typeof diff === "string" ? diff.toLowerCase() : diff.mapDifficulty.toLowerCase())
  );
  if (!difficulty) {
    throw new Error(
      `Unknown difficulty: ${typeof diff === "string" ? diff : diff.mapDifficulty.toLowerCase()}`
    );
  }
  return difficulty;
}

export function getAccDetails(badge: ScoreBadge) {
  let accDetails = `${badge.name != "-" ? badge.name : ""}`;
  if (badge.max == null) {
    accDetails += ` (> ${badge.min}%)`;
  } else if (badge.min == null) {
    accDetails += ` (< ${badge.max}%)`;
  } else {
    accDetails += ` (${badge.min}% - ${badge.max}%)`;
  }

  return accDetails;
}
