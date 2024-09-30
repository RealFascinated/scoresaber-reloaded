import ScoreSaberScoreToken from "@/common/model/token/scoresaber/score-saber-score-token";
import ScoreSaberLeaderboardToken from "@/common/model/token/scoresaber/score-saber-leaderboard-token";

/**
 * A badge to display in the score stats.
 */
export type ScoreBadge = {
  name: string;
  color?: (score: ScoreSaberScoreToken, leaderboard: ScoreSaberLeaderboardToken) => string | undefined;
  create: (
    score: ScoreSaberScoreToken,
    leaderboard: ScoreSaberLeaderboardToken
  ) => string | React.ReactNode | undefined;
};
