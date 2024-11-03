import ScoreSaberPlayerToken from "../types/token/scoresaber/player";
import ScoreSaberPlayer from "../player/impl/scoresaber-player";
import { ScoreSaberLeaderboardPlayerInfoToken } from "../types/token/scoresaber/leaderboard-player-info";
import { MapDifficulty } from "../score/map-difficulty";

export type ScoreSaberRole = {
  /**
   * The name of the role.
   */
  name: string;

  /**
   * The role for this role.
   */
  role: string;

  /**
   * The color of the role.
   */
  color: string;
};

export const scoreSaberRoles: ScoreSaberRole[] = [
  {
    name: "Admin",
    role: "Admin",
    color: "#bfdcf9",
  },
  {
    name: "Head of Quality Assurance",
    role: "Head of Quality Assurance",
    color: "#ff006f",
  },
  {
    name: "Nomination Assessment Team",
    role: "Nomination Assessment",
    color: "#0b64f0",
  },
  {
    name: "Quality Assurance Team",
    role: "Quality Assurance",
    color: "#f70000",
  },
  {
    name: "Ranking Team",
    role: "Ranking Team",
    color: "#1abc9c",
  },
  {
    name: "Ranking Team Recruit",
    role: "Recruit",
    color: "#11806a",
  },
  {
    name: "Supporter",
    role: "Supporter",
    color: "#f96854",
  },
];

/**
 * Gets the role for a player.
 *
 * @param player the player
 * @returns the role
 */
export function getScoreSaberRoles(
  player: ScoreSaberPlayerToken | ScoreSaberLeaderboardPlayerInfoToken | ScoreSaberPlayer
): ScoreSaberRole[] {
  const toReturn: ScoreSaberRole[] = [];
  const rawRoles = player.role?.split(", ") || [player.role];

  for (const role of rawRoles) {
    const found = scoreSaberRoles.find(r => r.name === role);
    if (found) {
      toReturn.push(found);
    }
  }
  return toReturn;
}

/**
 * Formats the ScoreSaber difficulty number
 *
 * @param diff the difficulty number
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
