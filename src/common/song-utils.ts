const diffColors: Record<string, string> = {
  easy: "#3CB371",
  normal: "#59b0f4",
  hard: "#FF6347",
  expert: "#bf2a42",
  expertplus: "#8f48db",
};

export type ScoreBadge = {
  name: string;
  min: number | null;
  max: number | null;
  color: string;
};

const scoreBadges: ScoreBadge[] = [
  { name: "SS+", min: 95, max: null, color: diffColors.expertplus },
  { name: "SS", min: 90, max: 95, color: diffColors.expert },
  { name: "S+", min: 85, max: 90, color: diffColors.hard },
  { name: "S", min: 80, max: 85, color: diffColors.normal },
  { name: "A", min: 70, max: 80, color: diffColors.easy },
  { name: "-", min: null, max: 70, color: "hsl(var(--accent))" },
];

/**
 * Returns the color based on the accuracy provided.
 *
 * @param acc - The accuracy for the score
 * @returns The corresponding color for the accuracy.
 */
export function getScoreColorFromAccuracy(acc: number): ScoreBadge {
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
 * Turns the difficulty of a song into a color
 *
 * @param diff the difficulty to get the color for
 * @returns the color for the difficulty
 */
export function songDifficultyToColor(diff: string) {
  diff = diff.replace("+", "Plus");
  return diffColors[diff.toLowerCase() as keyof typeof diffColors];
}
