import { MapDifficulty } from "../schemas/map/map-difficulty";

export type Difficulty = {
  /**
   * The id of the difficulty
   */
  id: string;

  /**
   * The name of the difficulty
   */
  mapDifficulty: MapDifficulty;

  /**
   * The display name of the difficulty
   */
  displayName?: string;

  /**
   * The short name of the difficulty
   */
  shortName: string;

  /**
   * The color of the difficulty
   */
  color: string;

  /**
   * The difficulty id of the difficulty
   */
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

const scoreBadges: ScoreBadge[] = [
  { name: "GOD", min: 98, max: null, color: "#008B8B", textColor: "#00FFFF" },
  {
    name: "SS+",
    min: 95,
    max: 98,
    color: "var(--expertPlus)",
    textColor: "#00FFFF",
  },
  { name: "SS", min: 90, max: 95, color: "var(--expert)", textColor: "#00FFFF" },
  { name: "S+", min: 85, max: 90, color: "var(--hard)", textColor: "#FFFFFF" },
  { name: "S", min: 80, max: 85, color: "var(--normal)", textColor: "#FFFFFF" },
  { name: "A", min: 70, max: 80, color: "var(--easy)", textColor: "#00FF00" },
  { name: "-", min: null, max: 70, color: "var(--accent)", textColor: "#FF0000" },
];

/**
 * Returns the color based on the accuracy provided.
 *
 * @param acc - The accuracy for the score
 * @returns The corresponding color for the accuracy.
 */
export function getScoreBadgeFromAccuracy(acc: number): ScoreBadge {
  // Iterate through all badges in order
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

/**
 * Gets a score badge from its name.
 *
 * @param name the name of the badge
 * @returns the badge
 */
export function getScoreBadgeFromName(name: string): ScoreBadge {
  return scoreBadges.find(badge => badge.name === name)!;
}

/**
 * Gets the name of the difficulty
 *
 * @param diff the difficulty
 */
export function getDifficultyName(diff: Difficulty | MapDifficulty) {
  const difficulty = getDifficulty(diff);
  return difficulty.displayName ?? difficulty.mapDifficulty;
}

/**
 * Gets a {@link Difficulty} from its name
 *
 * @param diff the name of the difficulty
 * @returns the difficulty
 */
export function getDifficulty(diff: Difficulty | MapDifficulty) {
  const difficulty = difficulties.find(
    d => d.id === (typeof diff === "string" ? diff.toLowerCase() : diff.mapDifficulty.toLowerCase())
  );
  if (!difficulty) {
    throw new Error(`Unknown difficulty: ${typeof diff === "string" ? diff : diff.mapDifficulty.toLowerCase()}`);
  }
  return difficulty;
}

/**
 * Gets the acc details for a badge.
 *
 * @param badge the badge
 * @returns the acc details
 */
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
