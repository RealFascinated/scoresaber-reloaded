import PlayerScoreAccuracyChart from "@/components/leaderboard/page/chart/player-score-accuracy-chart";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import ScoreAccuracyStats from "@/components/score/score-accuracy-stats";
import { ScoreStatsResponse } from "@ssr/common/response/scorestats-response";

type ScoreOverviewProps = {
  /**
   * The score stats for this score.
   */
  scoreStats?: ScoreStatsResponse;

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
        <div className="flex flex-col md:flex-row md:px-2 gap-3">
          <ScoreAccuracyStats scoreStats={scoreStats} />
          <PlayerScoreAccuracyChart scoreStats={scoreStats} leaderboard={leaderboard} />
        </div>
      )}
    </>
  );
}
