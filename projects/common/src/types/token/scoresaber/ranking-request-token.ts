import ScoreSaberLeaderboardToken from "./leaderboard";

export default interface RankingRequestToken {
  requestId: number;
  weight: number;
  leaderboardInfo: ScoreSaberLeaderboardToken;

  // todo: complete this i cba rn
}
