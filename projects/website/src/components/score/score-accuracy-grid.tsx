import SimpleTooltip from "@/components/simple-tooltip";
import { ScoreStatsToken } from "@ssr/common/types/token/beatleader/score-stats/score-stats";

type ScoreAccuracyGridProps = {
  scoreStats: ScoreStatsToken;
};

const MAX_ACCURACY = 115;

export default function ScoreAccuracyGrid({ scoreStats }: ScoreAccuracyGridProps) {
  return (
    <div className="grid grid-rows-3 grid-cols-4 h-fit bg-muted rounded-md overflow-hidden">
      {scoreStats.accuracyTracker.gridAcc.map((acc, i) => {
        const percent = Math.min(Math.max(acc, 0), MAX_ACCURACY) / MAX_ACCURACY;

        return (
          <SimpleTooltip display={<p>{(percent * 100).toFixed(2)}%</p>} key={i}>
            <div className="flex flex-col gap-1 items-center justify-center p-2.5 border-secondary border text-sm">
              <p>{acc.toFixed(1)}</p>
            </div>
          </SimpleTooltip>
        );
      })}
    </div>
  );
}
