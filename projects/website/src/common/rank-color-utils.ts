/**
 * Gets the color of the score rank.
 *
 * @param rank the rank of the score
 * @returns the color of the score rank
 */
export function getRankColor(rank: number) {
  switch (rank) {
    case 1:
      return "text-[#B8860B]"; // Gold
    case 2:
      return "text-[#888888]"; // Silver
    case 3:
      return "text-[#8B4513]"; // Lighter bronze
    default:
      return "text-white"; // Default
  }
}

/**
 * Gets the color of the country rank.
 *
 * @param rank the rank of the country
 * @returns the color of the country rank
 */
export function getRankBgColor(rank: number) {
  switch (rank) {
    case 1:
      return "bg-[#B8860B]"; // Gold
    case 2:
      return "bg-[#888888]"; // Silver
    case 3:
      return "bg-[#8B4513]"; // Lighter bronze
    default:
      return "bg-[#313131]"; // Default
  }
}
