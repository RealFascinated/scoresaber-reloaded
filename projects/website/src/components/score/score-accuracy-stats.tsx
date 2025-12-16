import { Colors } from "@/common/colors";
import { cn } from "@/common/utils";
import SimpleTooltip from "@/components/simple-tooltip";
import { ScoreStatsResponse } from "@ssr/common/schemas/beatleader/score-stats";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import { ScoreStatsToken } from "@ssr/common/types/token/beatleader/score-stats/score-stats";
import { AnimatePresence, motion } from "framer-motion";

type ScoreAccuracyStatProps = {
  scoreStats: ScoreStatsResponse;
};

type Hand = "left" | "right";
const handColors: Record<Hand, string> = {
  left: Colors.hands.left,
  right: Colors.hands.right,
};
const MAX_ACCURACY = 115;
const CIRCLE_RADIUS = 32;
const STROKE_WIDTH = 4;

interface AccuracyCircleProps {
  accuracy: number;
  averageCut: number[];
  hand: Hand;
}

function AverageCutValues({ cuts, hand }: { cuts: number[]; hand: Hand }) {
  return (
    <div className="space-y-0.5">
      {cuts.map((cut, i) => (
        <div
          key={i}
          className={cn("flex gap-1", hand === "right" ? "justify-end" : "justify-start")}
        >
          <p className="text-xs font-medium text-gray-400">{cut.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}

function AccuracyCircle({ accuracy, averageCut, hand }: AccuracyCircleProps) {
  const percent = Math.min(Math.max(accuracy, 0), MAX_ACCURACY) / MAX_ACCURACY;
  const center = CIRCLE_RADIUS + STROKE_WIDTH;
  const size = (CIRCLE_RADIUS + STROKE_WIDTH) * 2;

  return (
    <div className="flex items-center gap-2 md:gap-3">
      <div
        className={cn(
          "flex items-center gap-2 md:gap-3",
          hand === "right" ? "flex-row-reverse" : "flex-row"
        )}
      >
        <AverageCutValues cuts={averageCut} hand={hand} />
        <div className="relative shrink-0">
          <svg
            width={size}
            height={size}
            style={{ transform: "rotate(-90deg)" }}
            className="drop-shadow-sm"
          >
            <circle
              cx={center}
              cy={center}
              r={CIRCLE_RADIUS}
              fill="none"
              stroke="currentColor"
              strokeWidth={STROKE_WIDTH}
              className="text-gray-800"
            />
            <AnimatePresence mode="wait">
              <motion.circle
                key={`${hand}-${accuracy}`}
                cx={center}
                cy={center}
                r={CIRCLE_RADIUS}
                fill="none"
                stroke={handColors[hand]}
                strokeWidth={STROKE_WIDTH}
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: percent }}
                exit={{ pathLength: 0 }}
                transition={{ duration: 1, ease: "easeInOut" }}
                className="drop-shadow-sm"
              />
            </AnimatePresence>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <SimpleTooltip
              display={<p className="text-sm font-medium">{(percent * 100).toFixed(2)}%</p>}
              className="cursor-default"
            >
              <p className="text-sm font-semibold text-white">{accuracy.toFixed(2)}</p>
            </SimpleTooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

function HandStat({ hand, name, value }: { hand: Hand; name: string; value: string }) {
  return (
    <div
      className="hover:bg-opacity-30 inline-flex w-full min-w-0 items-center justify-between rounded-lg px-2 py-1.5 transition-colors md:px-3"
      style={{ backgroundColor: `${handColors[hand]}20` }}
    >
      <p className="shrink-0 text-xs font-semibold tracking-wide text-gray-300 uppercase">{name}</p>
      <p className="ml-2 truncate text-sm font-bold text-white">{value}</p>
    </div>
  );
}

function useHandStats(scoreStats: ScoreStatsToken, hand: Hand) {
  const { accuracyTracker } = scoreStats;
  return {
    accuracy: hand === "left" ? accuracyTracker.accLeft : accuracyTracker.accRight,
    averageCut: accuracyTracker[`${hand}AverageCut`],
    timeDependence: accuracyTracker[`${hand}TimeDependence`],
    preSwing: accuracyTracker[`${hand}Preswing`] * 100,
    postSwing: accuracyTracker[`${hand}Postswing`] * 100,
  };
}

function HandAccuracy({ scoreStats, hand }: { scoreStats: ScoreStatsToken; hand: Hand }) {
  const { accuracy, averageCut, timeDependence, preSwing, postSwing } = useHandStats(
    scoreStats,
    hand
  );
  const tooltipLabel = (text: string) => `${capitalizeFirstLetter(hand)} Hand ${text}`;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-3",
        hand === "right" ? "items-end" : "items-start"
      )}
    >
      <AccuracyCircle accuracy={accuracy} averageCut={averageCut} hand={hand} />
      <div className="flex w-full max-w-[200px] flex-col gap-1.5">
        <SimpleTooltip display={tooltipLabel("Time-Dependence")} className="cursor-default">
          <HandStat hand={hand} name="TD" value={`${timeDependence.toFixed(3)}`} />
        </SimpleTooltip>
        <SimpleTooltip display={tooltipLabel("Pre-Swing")} className="cursor-default">
          <HandStat hand={hand} name="Pre" value={`${preSwing.toFixed(2)}%`} />
        </SimpleTooltip>
        <SimpleTooltip display={tooltipLabel("Post-Swing")} className="cursor-default">
          <HandStat hand={hand} name="Post" value={`${postSwing.toFixed(2)}%`} />
        </SimpleTooltip>
      </div>
    </div>
  );
}

export default function ScoreAccuracyStats({ scoreStats }: ScoreAccuracyStatProps) {
  return (
    <div className="flex w-full items-start justify-between gap-3 overflow-hidden md:gap-6">
      <HandAccuracy scoreStats={scoreStats.current} hand="left" />
      <div className="bg-border hidden h-full w-px shrink-0 self-stretch md:block" />
      <HandAccuracy scoreStats={scoreStats.current} hand="right" />
    </div>
  );
}
