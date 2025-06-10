/**
 * Gets the color of the score rank.
 *
 * @param rank the rank of the score
 * @returns the color of the score rank
 */
export function getRankColor(rank: number) {
  switch (rank) {
    case 1:
      return "text-yellow-500"; // Gold
    case 2:
      return "text-zinc-300"; // Silver
    case 3:
      return "text-orange-500"; // Lighter bronze
    default:
      return "text-slate-400"; // Muted slate
  }
}
