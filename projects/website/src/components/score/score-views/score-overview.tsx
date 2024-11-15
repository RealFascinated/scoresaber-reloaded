import PlayerScoreAccuracyChart from "@/components/leaderboard/page/chart/player-score-accuracy-chart";
import { ScoreStatsToken } from "@ssr/common/types/token/beatleader/score-stats/score-stats";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";

type ScoreOverviewProps = {
  /**
   * The score stats for this score.
   */
  scoreStats?: ScoreStatsToken;

  /**
   * The leaderboard the score was set on.
   */
  leaderboard: ScoreSaberLeaderboard;
};

export function ScoreOverview({ scoreStats, leaderboard }: ScoreOverviewProps) {
  if (!scoreStats) {
    return (
      <div className="flex justify-center">
        <p>No score stats found.</p>
      </div>
    );
  }

  return (
    <>
      {scoreStats && (
        <div className="flex gap-2">
          <PlayerScoreAccuracyChart scoreStats={scoreStats} leaderboard={leaderboard} />
        </div>
      )}
    </>
  );
}
