import { ScoreSaberV2PlayerDeviceToken } from "./player-device";

export type ScoreSaberV2PlayerStatsToken = {
  realmId: number;
  realmName: string;
  rank: number;
  countryRank: number;
  totalPP: number;
  totalScore: string;
  totalRankedScore: string;
  totalPlayedLeaderboards: number;
  totalPlayedRankedLeaderboards: number;
  totalSubmittedPlays: number;
  totalReplayViews: number;
  averageAccuracy: number;
  weightedAverageAccuracy: number;
  completionAccuracy: number;
  device: ScoreSaberV2PlayerDeviceToken;
};
