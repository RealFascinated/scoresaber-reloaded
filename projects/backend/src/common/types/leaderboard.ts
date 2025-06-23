import { DetailType } from "@ssr/common/detail-type";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";

export type RefreshResult = {
  refreshedLeaderboards: number;
  updatedScoresCount: number;
  updatedLeaderboardsCount: number;
};

export type LeaderboardUpdate = {
  leaderboard: ScoreSaberLeaderboard;
  previousLeaderboard: ScoreSaberLeaderboard;
  rankedStatusChanged: boolean;
  starCountChanged: boolean;
  qualifiedStatusChanged: boolean;
};

export type LeaderboardUpdates = {
  updatedScoresCount: number;
  updatedLeaderboardsCount: number;
  updatedLeaderboards: { leaderboard: ScoreSaberLeaderboard; update: LeaderboardUpdate }[];
};

export type LeaderboardOptions = {
  cacheOnly?: boolean;
  includeBeatSaver?: boolean;
  beatSaverType?: DetailType;
  type?: DetailType;
};

export type LeaderboardData = {
  leaderboard: ScoreSaberLeaderboard;
  cached: boolean;
  trackedScores: number;
};
