import { MapDifficulty } from "../score/map-difficulty";

export type Difficulty = {
  /**
   * The name of the difficulty
   */
  name: MapDifficulty;

  /**
   * The alternative name of the difficulty
   */
  alternativeName?: string;

  /**
   * The color of the difficulty
   */
  color: string;

  /**
   * The difficulty id (used for sorting)
   */
  id: number;
};

const difficulties: Difficulty[] = [
  { name: "Easy", color: "#3cb371", id: 1 },
  { name: "Normal", color: "#59b0f4", id: 3 },
  { name: "Hard", color: "#FF6347", id: 5 },
  { name: "Expert", color: "#bf2a42", id: 7 },
  { name: "ExpertPlus", alternativeName: "Expert+", color: "#8f48db", id: 9 },
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
    color: getDifficulty("ExpertPlus")!.color,
    textColor: "#00FFFF",
  },
  { name: "SS", min: 90, max: 95, color: getDifficulty("Expert")!.color, textColor: "#00FFFF" },
  { name: "S+", min: 85, max: 90, color: getDifficulty("Hard")!.color, textColor: "#FFFFFF" },
  { name: "S", min: 80, max: 85, color: getDifficulty("Normal")!.color, textColor: "#FFFFFF" },
  { name: "A", min: 70, max: 80, color: getDifficulty("Easy")!.color, textColor: "#00FF00" },
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
 * Get a random difficulty, except ExpertPlus.
 */
export function getRandomDifficulty(): Difficulty {
  return difficulties[Math.floor(Math.random() * (difficulties.length - 1))];
}

/**
 * Gets the name of the difficulty
 *
 * @param diff the difficulty
 */
export function getDifficultyName(diff: Difficulty | MapDifficulty) {
  const difficulty = getDifficulty(diff);
  return difficulty.alternativeName ?? difficulty.name;
}

/**
 * Gets a {@link Difficulty} from its name
 *
 * @param diff the name of the difficulty
 * @returns the difficulty
 */
export function getDifficulty(diff: Difficulty | MapDifficulty) {
  const difficulty = difficulties.find(
    d => d.name === (typeof diff === "string" ? diff : diff.name)
  );
  if (!difficulty) {
    throw new Error(`Unknown difficulty: ${diff}`);
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
