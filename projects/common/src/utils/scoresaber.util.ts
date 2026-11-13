import { ScoreSaberCurve } from "../leaderboard-curve/scoresaber-curve";
import type { HMD } from "../schemas/hmd";
import { MapDifficulty } from "../schemas/map/map-difficulty";
import { PlayerPpsResponse } from "../schemas/response/player/player-pps";

export type ScoreSaberRole = {
  name: string;

  shortName?: string;

  roleId: string;

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

export function getScoreSaberRoles(player: { role?: string | null }): ScoreSaberRole[] {
  const toReturn: ScoreSaberRole[] = [];
  if ("role" in player) {
    const rawRoles = player.role?.split(", ") || [player.role];
    for (const role of rawRoles) {
      const found = scoreSaberRoles.find(r => r.roleId.toLowerCase() === role?.toLowerCase());
      if (found) {
        toReturn.push(found);
      }
    }
  }
  return toReturn;
}

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

export function getScoreSaberDifficultyFromDifficulty(difficulty: MapDifficulty): number {
  switch (difficulty) {
    case "Easy":
      return 1;
    case "Normal":
      return 3;
    case "Hard":
      return 5;
    case "Expert":
      return 7;
    case "ExpertPlus":
      return 9;
    default:
      throw new Error(`Unknown difficulty: ${difficulty}`);
  }
}

export function updateScoreWeights(scores: PlayerPpsResponse["scores"]) {
  for (let i = 0; i < scores.length; i++) {
    scores[i].weight = Math.pow(ScoreSaberCurve.WEIGHT_COEFFICIENT, i);
  }
}

export function getScoreSaberLeaderboardCoverUrl(songHash: string): string {
  return `https://cdn.scoresaber.com/covers/${songHash.toUpperCase()}.png`;
}
