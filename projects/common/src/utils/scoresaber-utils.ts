import { MapDifficulty } from "../score/map-difficulty";

/**
 * Formats the ScoreSaber difficulty number
 *
 * @param diff the diffuiclity number
 */
export function getDifficultyFromScoreSaberDifficulty(diff: number): MapDifficulty {
  switch (diff) {
    case 1: {
      return "Easy";
    }
    case 3: {
      return "Normal";
    }
    case 5: {
      return "Hard";
    }
    case 7: {
      return "Expert";
    }
    case 9: {
      return "ExpertPlus";
    }
    default: {
      return "Unknown";
    }
  }
}
