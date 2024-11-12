import PlayerScoreAccuracyChart from "@/components/leaderboard/chart/player-score-accuracy-chart";
import LeaderboardScores from "@/components/leaderboard/leaderboard-scores";
import { ScoreStatsToken } from "@ssr/common/types/token/beatleader/score-stats/score-stats";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";

type ScoreOverviewProps = {
  /**
   * The player to highlight
   */
  highlightedPlayer?: ScoreSaberPlayer;

  /**
   * The initial page to show
   */
  initialPage: number;

  /**
   * The score stats for this score.
   */
  scoreStats?: ScoreStatsToken;

  /**
   * The leaderboard the score was set on.
   */
  leaderboard: ScoreSaberLeaderboard;
};

export function ScoreOverview({ highlightedPlayer, scoreStats, initialPage, leaderboard }: ScoreOverviewProps) {
  return (
    <>
      {scoreStats && (
        <div className="flex gap-2">
          <PlayerScoreAccuracyChart scoreStats={scoreStats} leaderboard={leaderboard} />
        </div>
      )}

      <LeaderboardScores
        initialPage={initialPage}
        leaderboard={leaderboard}
        highlightedPlayer={highlightedPlayer}
        disableUrlChanging
      />
    </>
  );
}
