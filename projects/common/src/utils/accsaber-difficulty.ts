import { MapDifficulty } from "../schemas/map/map-difficulty";

/**
 * Normalizes AccSaber REST difficulty strings (serialized `Difficulty` enum names
 * such as `EXPERT_PLUS`) to MapDifficulty for BeatLeader lookups.
 */
export function accSaberDifficultyToMapDifficulty(raw: string | undefined | null): MapDifficulty {
  const n = (raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "")
    .replace("expert+", "expertplus");

  switch (n) {
    case "easy":
      return "Easy";
    case "normal":
      return "Normal";
    case "hard":
      return "Hard";
    case "expert":
      return "Expert";
    case "expertplus":
      return "ExpertPlus";
    default:
      return "Expert";
  }
}
