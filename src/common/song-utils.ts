export const diffColors: Record<string, string> = {
  easy: "MediumSeaGreen",
  normal: "#59b0f4",
  hard: "tomato",
  expert: "#bf2a42",
  expertPlus: "#8f48db",
};

const badgesDef: {
  name: string;
  min: number | null;
  max: number | null;
  color: string;
}[] = [
  { name: "SS+", min: 95, max: null, color: diffColors.expertPlus },
  { name: "SS", min: 90, max: 95, color: diffColors.expert },
  { name: "S+", min: 85, max: 90, color: diffColors.hard },
  { name: "S", min: 80, max: 85, color: diffColors.normal },
  { name: "A", min: 70, max: 80, color: diffColors.easy },
  { name: "-", min: null, max: 70, color: "hsl(var(--accent))" },
];

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

/**
 * Formats the accuracy into a color
 *
 * @param acc the accuracy to get the color for
 */
export function accuracyToColor(acc: number): string {
  for (const badge of badgesDef) {
    if (
      (badge.min === null || acc >= badge.min) &&
      (badge.max === null || acc < badge.max)
    ) {
      return badge.color;
    }
  }
  // Return a default color if no badge matches
  return "#000000"; // black or any default color
}
