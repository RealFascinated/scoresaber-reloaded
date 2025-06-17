import SimpleTooltip from "@/components/simple-tooltip";
import { ScoreStatsToken } from "@ssr/common/types/token/beatleader/score-stats/score-stats";

type ScoreAccuracyGridProps = {
  scoreStats: ScoreStatsToken;
};

const MAX_ACCURACY = 115;

export default function ScoreAccuracyGrid({ scoreStats }: ScoreAccuracyGridProps) {
  return (
    <div className="grid grid-cols-4 grid-rows-3 gap-1 p-1">
      {scoreStats.accuracyTracker.gridAcc.map((acc, i) => {
        const percent = Math.min(Math.max(acc, 0), MAX_ACCURACY) / MAX_ACCURACY;
        return (
          <SimpleTooltip
            display={
              <div className="flex items-center gap-2">
                <p className="font-medium">{(percent * 100).toFixed(1)}%</p>
              </div>
            }
            key={i}
          >
            <div className="bg-muted hover:bg-accent flex items-center justify-center rounded-md p-2 transition-colors">
              <p className="text-sm font-medium text-gray-200">{acc.toFixed(1)}</p>
            </div>
          </SimpleTooltip>
        );
      })}
    </div>
  );
}
