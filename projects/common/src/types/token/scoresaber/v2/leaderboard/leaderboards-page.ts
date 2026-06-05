import ScoreSaberV2MetadataToken from "../metadata";
import { ScoreSaberV2LeaderboardDifficultyToken } from "./leaderboard-difficulty";
import { ScoreSaberV2LeaderboardMapToken } from "./leaderboard-map";
import { ScoreSaberV2LeaderboardRealmToken } from "./leaderboard-realm";

export type ScoreSaberV2LeaderboardPageToken = {
  id: number;
  map: ScoreSaberV2LeaderboardMapToken;
  difficulty: ScoreSaberV2LeaderboardDifficultyToken;
  maxScore: number;
  totalScores: number;
  dailyScores: number;
  createdAt: string;
  realm: ScoreSaberV2LeaderboardRealmToken;
};

export default interface ScoreSaberV2LeaderboardsPageToken {
  data: ScoreSaberV2LeaderboardPageToken[];
  metadata: ScoreSaberV2MetadataToken;
}
