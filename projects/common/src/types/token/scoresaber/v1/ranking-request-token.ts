import ScoreSaberLeaderboardToken from "./leaderboard";

export default interface RankingRequestToken {
  requestId: number;
  weight: number;
  leaderboardInfo: ScoreSaberLeaderboardToken;
  created_at: string;
  difficultyCount: number;

  // todo: complete this i cba rn
}
