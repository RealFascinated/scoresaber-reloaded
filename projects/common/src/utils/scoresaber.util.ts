import ApiServiceRegistry from "../../src/api-service/api-service-registry";
import { ScoreSaberScore } from "../../src/model/score/impl/scoresaber-score";
import { HMD } from "../hmds";
import ScoreSaberPlayer from "../player/impl/scoresaber-player";
import { MapDifficulty } from "../score/map-difficulty";
import { ScoreSaberLeaderboardPlayerInfoToken } from "../types/token/scoresaber/leaderboard-player-info";
import { ScoreSaberPlayerToken } from "../types/token/scoresaber/player";

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

export const ScoreSaberHMDs: Record<number, HMD> = {
  0: "Unknown",
  1: "Rift CV1",
  2: "Vive",
  4: "Vive Pro",
  8: "Windows Mixed Reality",
  16: "Rift S",
  32: "Quest",
  64: "Valve Index",
  128: "Vive Cosmos",
};

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

/**
 * Gets the avatar for a player.
 *
 * @param player the player
 * @returns the avatar
 */
export function getScoreSaberAvatar(
  player: ScoreSaberPlayerToken | ScoreSaberLeaderboardPlayerInfoToken | ScoreSaberPlayer
): string {
  return `https://cdn.scoresaber.com/avatars/${player.id}.jpg`;
}

/**
 * Updates the weights of the scores
 *
 * @param scores the scores
 */
export function updateScoreWeights(scores: Pick<ScoreSaberScore, "pp" | "weight" | "scoreId">[]) {
  for (let i = 0; i < scores.length; i++) {
    scores[i].weight = Math.pow(
      ApiServiceRegistry.getInstance().getScoreSaberService().WEIGHT_COEFFICIENT,
      i
    );
  }
}
