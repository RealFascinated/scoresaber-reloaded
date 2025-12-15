import { ScoreSaberScore } from "../../src/model/score/impl/scoresaber-score";
import { HMD } from "../hmds";
import { ScoreSaberCurve } from "../leaderboard-curve/scoresaber-curve";
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
   * The short name of the role.
   */
  shortName?: string;

  /**
   * The ScoreSaber role id for this role.
   */
  roleId: string;

  /**
   * The color of the role.
   */
  color: string;
};

export const scoreSaberRoles: ScoreSaberRole[] = [
  {
    name: "Admin",
    roleId: "Admin",
    color: "#bfdcf9",
  },
  {
    name: "Head of Quality Assurance",
    shortName: "Head QAT",
    roleId: "QAT Head",
    color: "#ff006f",
  },
  {
    name: "Nomination Assessment Team",
    shortName: "NAT",
    roleId: "Nomination Assessment Team",
    color: "#0b64f0",
  },
  {
    name: "Quality Assurance Team",
    shortName: "QA Team",
    roleId: "Quality Assurance Team",
    color: "#f70000",
  },
  {
    name: "Ranking Team",
    shortName: "RT",
    roleId: "Ranking Team",
    color: "#1abc9c",
  },
  {
    name: "Ranking Team Recruit",
    shortName: "RT Recruit",
    roleId: "Recruit",
    color: "#11806a",
  },
  {
    name: "Head of Content Creation Team",
    shortName: "Head CCT",
    roleId: "Content Creation Lead",
    color: "#62f60a",
  },
  {
    name: "Content Creation Team",
    shortName: "CCT",
    roleId: "Content Creation Team",
    color: "#62f60a",
  },
  {
    name: "Supporter",
    roleId: "Supporter",
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
    const found = scoreSaberRoles.find(r => r.roleId === role);
    if (found) {
      toReturn.push(found);
    }
  }
  return toReturn;
}

/**
 * Formats the ScoreSaber difficulty number
 *
 * @param ssDifficultyNumber the difficulty number
 */
export function getDifficultyFromScoreSaberDifficulty(ssDifficultyNumber: number): MapDifficulty {
  switch (ssDifficultyNumber) {
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
      throw new Error(`Unknown difficulty number: ${ssDifficultyNumber}`);
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
  const fallbackAvatar = `https://cdn.scoresaber.com/avatars/${player.id}.jpg`;

  if ("profilePicture" in player) {
    return player.profilePicture ?? fallbackAvatar;
  }
  if ("avatar" in player) {
    return player.avatar ?? fallbackAvatar;
  }

  return fallbackAvatar;
}

/**
 * Updates the weights of the scores
 *
 * @param scores the scores
 */
export function updateScoreWeights(scores: Pick<ScoreSaberScore, "pp" | "weight" | "scoreId">[]) {
  for (let i = 0; i < scores.length; i++) {
    scores[i].weight = Math.pow(ScoreSaberCurve.WEIGHT_COEFFICIENT, i);
  }
}
