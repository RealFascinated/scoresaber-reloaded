/**
 * Turns the difficulty of a song into a color
 *
 * @param diff the difficulty to get the color for
 * @returns the color for the difficulty
 */
export function songDifficultyToColor(diff: string) {
  switch (diff.toLowerCase()) {
    case "easy":
      return "#3cb371";
    case "normal":
      return "#59b0f4";
    case "hard":
      return "#FF6347";
    case "expert":
      return "#bf2a42";
    case "expert+":
      return "#8f48db";
    default:
      return "gray";
  }
}
