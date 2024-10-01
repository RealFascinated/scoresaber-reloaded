type Difficulty = {
  name: DifficultyName;
  gamemode?: string;
  color: string;
};

type DifficultyName = "Easy" | "Normal" | "Hard" | "Expert" | "Expert+";

const difficulties: Difficulty[] = [
  { name: "Easy", color: "#59b0f4" },
  { name: "Normal", color: "#59b0f4" },
  { name: "Hard", color: "#FF6347" },
  { name: "Expert", color: "#bf2a42" },
  { name: "Expert+", color: "#8f48db" },
];

export type ScoreBadge = {
  name: string;
  min: number | null;
  max: number | null;
  color: string;
};

const scoreBadges: ScoreBadge[] = [
  { name: "SS+", min: 95, max: null, color: getDifficulty("Expert+")!.color },
  { name: "SS", min: 90, max: 95, color: getDifficulty("Expert")!.color },
  { name: "S+", min: 85, max: 90, color: getDifficulty("Hard")!.color },
  { name: "S", min: 80, max: 85, color: getDifficulty("Normal")!.color },
  { name: "A", min: 70, max: 80, color: getDifficulty("Easy")!.color },
  { name: "-", min: null, max: 70, color: "hsl(var(--accent))" },
];

/**
 * Returns the color based on the accuracy provided.
 *
 * @param acc - The accuracy for the score
 * @returns The corresponding color for the accuracy.
 */
export function getScoreBadgeFromAccuracy(acc: number): ScoreBadge {
  // Check for SS+ first since it has no upper limit
  if (acc >= 95) {
    return scoreBadges[0]; // SS+ color
  }

  // Iterate through the rest of the badges
  for (const badge of scoreBadges) {
    const min = badge.min ?? -Infinity; // Treat null `min` as -Infinity
    const max = badge.max ?? Infinity; // Treat null `max` as Infinity

    // Check if the accuracy falls within the badge's range
    if (acc >= min && acc < (max === null ? Infinity : max)) {
      return badge; // Return the color of the matching badge
    }
  }

  // Fallback color if no badge matches (should not happen)
  return scoreBadges[scoreBadges.length - 1];
}

/**
 * Parses a raw difficulty into a {@link Difficulty}
 * Example: _Easy_SoloStandard -> { name: "Easy", type: "Standard", color: "#59b0f4" }
 *
 * @param rawDifficulty the raw difficulty to parse
 * @return the parsed difficulty
 */
export function getDifficultyFromRawDifficulty(rawDifficulty: string): Difficulty {
  const [name, ...type] = rawDifficulty
    .replace("Plus", "+") // Replaces Plus with + so we can match it to our difficulty names
    .replace("Solo", "") // Removes "Solo"
    .replace(/^_+|_+$/g, "") // Removes leading and trailing underscores
    .split("_");
  const difficulty = difficulties.find(d => d.name === name);
  if (!difficulty) {
    throw new Error(`Unknown difficulty: ${rawDifficulty}`);
  }
  return {
    ...difficulty,
    gamemode: type.join("_"),
  };
}

/**
 * Gets a {@link Difficulty} from its name
 *
 * @param diff the name of the difficulty
 * @returns the difficulty
 */
export function getDifficulty(diff: DifficultyName) {
  return difficulties.find(d => d.name === diff);
}

/**
 * Turns the difficulty of a song into a color
 *
 * @param diff the difficulty to get the color for
 * @returns the color for the difficulty
 */
export function songDifficultyToColor(diff: string) {
  return getDifficultyFromRawDifficulty(diff).color;
}
