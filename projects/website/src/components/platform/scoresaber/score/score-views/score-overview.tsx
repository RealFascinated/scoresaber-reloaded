import Card from "@/components/card";
import PlayerScoreAccuracyChart from "@/components/platform/scoresaber/score/chart/player-score-accuracy-chart";
import ScoreAccuracyStats from "@/components/score/score-accuracy-stats";
import StatValue from "@/components/statistic/stat-value";
import { SharedIcons } from "@/shared-icons";
import { ScoreStatsResponse } from "@ssr/common/schemas/response/beatleader/score-stats";
import { ScoreSaberLeaderboard } from "@ssr/common/schemas/scoresaber/leaderboard/leaderboard";
import { ScoreSaberScore } from "@ssr/common/schemas/scoresaber/score/score";

type ScoreOverviewProps = {
  /**
   * The score to display.
   */
  score: ScoreSaberScore;

  /**
   * The score stats for this score.
   */
  scoreStats?: ScoreStatsResponse;

  /**
   * The leaderboard the score was set on.
   */
  leaderboard: ScoreSaberLeaderboard;
};

export function ScoreOverview({ score, scoreStats, leaderboard }: ScoreOverviewProps) {
  if (!scoreStats) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-2 md:flex-row">
      {/* Stats */}
      <Card className="flex w-full flex-col items-center justify-center gap-3 rounded-xl md:mb-0 md:max-w-[360px]">
        <div className="flex w-full flex-row flex-wrap items-center justify-center gap-2">
          {score.beatLeaderScore && (
            <StatValue
              name="Pauses"
              icon={<SharedIcons.StatScorePausesIcon className="size-4 shrink-0" />}
              value={score.beatLeaderScore.pauses}
            />
          )}
          {scoreStats && (
            <StatValue
              name="JD"
              icon={<SharedIcons.StatJumpDistanceIcon className="size-4 shrink-0" />}
              value={scoreStats.current.winTracker.jumpDistance.toFixed(2)}
            />
          )}
          {!score.fullCombo && score.beatLeaderScore && (
            <StatValue
              name="FC Acc"
              icon={<SharedIcons.StatFullComboAccuracyIcon className="size-4 shrink-0" />}
              value={`${score.beatLeaderScore.fcAccuracy.toFixed(2)}%`}
            />
          )}
        </div>

        {/* Accuracy Stats */}
        <div className="bg-accent-deep border-border flex w-full flex-col items-center justify-center gap-3 rounded-md border p-3">
          <ScoreAccuracyStats scoreStats={scoreStats} />
        </div>
      </Card>

      {/* Accuracy Chart */}
      <div className="flex h-full w-full items-center justify-center md:min-h-[320px]">
        <PlayerScoreAccuracyChart scoreStats={scoreStats} leaderboard={leaderboard} />
      </div>
    </div>
  );
}
