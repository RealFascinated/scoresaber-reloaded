import { Colors } from "@/common/colors";
import Card from "@/components/card";
import { ScoreStatsHitTrackerToken } from "@ssr/common/types/token/beatleader/score-stats/hit-tracker";

type Props = {
  hitTracker: ScoreStatsHitTrackerToken;
};

export default function HitTrackerStats({ hitTracker }: Props) {
  return (
    <Card className="rounded-xl">
      <div className="flex flex-col gap-3 p-4">
        <h3 className="text-sm font-semibold">Hit Statistics</h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <h4 className="text-muted-foreground text-sm font-medium">Left Hand</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md p-2" style={{ backgroundColor: `${Colors.hands.left}20` }}>
                <p className="text-muted-foreground text-xs">Misses</p>
                <p className="text-sm font-semibold">{hitTracker.leftMiss}</p>
              </div>
              <div className="rounded-md p-2" style={{ backgroundColor: `${Colors.hands.left}20` }}>
                <p className="text-muted-foreground text-xs">Bad Cuts</p>
                <p className="text-sm font-semibold">{hitTracker.leftBadCuts}</p>
              </div>
              <div className="rounded-md p-2" style={{ backgroundColor: `${Colors.hands.left}20` }}>
                <p className="text-muted-foreground text-xs">Bombs</p>
                <p className="text-sm font-semibold">{hitTracker.leftBombs}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <h4 className="text-muted-foreground text-sm font-medium">Right Hand</h4>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md p-2" style={{ backgroundColor: `${Colors.hands.right}20` }}>
                <p className="text-muted-foreground text-xs">Misses</p>
                <p className="text-sm font-semibold">{hitTracker.rightMiss}</p>
              </div>
              <div className="rounded-md p-2" style={{ backgroundColor: `${Colors.hands.right}20` }}>
                <p className="text-muted-foreground text-xs">Bad Cuts</p>
                <p className="text-sm font-semibold">{hitTracker.rightBadCuts}</p>
              </div>
              <div className="rounded-md p-2" style={{ backgroundColor: `${Colors.hands.right}20` }}>
                <p className="text-muted-foreground text-xs">Bombs</p>
                <p className="text-sm font-semibold">{hitTracker.rightBombs}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
