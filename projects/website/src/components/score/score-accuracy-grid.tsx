import SimpleTooltip from "@/components/simple-tooltip";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { ScoreStatsToken } from "@ssr/common/types/token/beatleader/score-stats/score-stats";
import { Button } from "../ui/button";

type ScoreAccuracyGridProps = {
  scoreStats: ScoreStatsToken;
};

const MAX_ACCURACY = 115;

export default function ScoreAccuracyGrid({ scoreStats }: ScoreAccuracyGridProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary" className="flex flex-row items-center gap-2">
          Open Accuracy Grid
          <ChartBarIcon className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="flex w-full flex-col items-center justify-center md:w-fit">
        <DialogTitle>Accuracy Grid</DialogTitle>
        <div className="grid grid-cols-4 grid-rows-3 gap-1">
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
                <div className="bg-muted hover:bg-accent flex w-16 items-center justify-center rounded-md p-2 transition-colors">
                  <p className="text-sm font-medium text-gray-200">{acc.toFixed(1)}</p>
                </div>
              </SimpleTooltip>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
