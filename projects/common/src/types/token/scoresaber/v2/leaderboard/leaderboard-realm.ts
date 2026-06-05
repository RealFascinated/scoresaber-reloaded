import { ScoreSaberV2LeaderboardStatusToken } from "./leaderboard-status";

export type ScoreSaberV2LeaderboardRealmToken = {
  realmId: number;
  realmName: string;
  leaderboardStatus: ScoreSaberV2LeaderboardStatusToken;
  positiveModifiers: boolean;
  stars: number;
  rankedAt: string | null;
  qualifiedAt: string | null;
  lovedAt: string | null;
};
