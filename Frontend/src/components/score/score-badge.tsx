import ScoreSaberScoreToken from "@/common/model/token/scoresaber/score-saber-score-token";
import ScoreSaberLeaderboardToken from "@/common/model/token/scoresaber/score-saber-leaderboard-token";
import StatValue from "@/components/stat-value";

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

/**
 * The badges to display in the score stats.
 */
type ScoreBadgeProps = {
  badges: ScoreBadge[];
  score: ScoreSaberScoreToken;
  leaderboard: ScoreSaberLeaderboardToken;
};

export function ScoreBadges({ badges, score, leaderboard }: ScoreBadgeProps) {
  return badges.map((badge, index) => {
    const toRender = badge.create(score, leaderboard);
    const color = badge.color?.(score, leaderboard);
    if (toRender === undefined) {
      return <div key={index} />;
    }
    return <StatValue key={index} color={color} value={toRender} />;
  });
}
