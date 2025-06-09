import { Colors } from "@/common/colors";
import ScoreAccuracyGrid from "@/components/score/score-accuracy-grid";
import SimpleTooltip from "@/components/simple-tooltip";
import { ScoreStatsResponse } from "@ssr/common/response/scorestats-response";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import { ScoreStatsToken } from "@ssr/common/types/token/beatleader/score-stats/score-stats";
import { motion } from "framer-motion";

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
    <div className="space-y-1">
      {cuts.map((cut, i) => (
        <div key={i} className={`flex gap-1 ${hand === "right" ? "justify-end" : "justify-start"}`}>
          <p className="text-sm font-medium text-gray-200">{cut.toFixed(2)}</p>
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
    <div className="flex items-center gap-4">
      <div className={`flex gap-4 ${hand === "right" ? "flex-row-reverse" : "flex-row"}`}>
        <AverageCutValues cuts={averageCut} hand={hand} />
        <div className="relative">
          <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            <circle
              cx={center}
              cy={center}
              r={CIRCLE_RADIUS}
              fill="none"
              stroke="#374151"
              strokeWidth={STROKE_WIDTH}
              className="opacity-50"
            />
            <motion.circle
              cx={center}
              cy={center}
              r={CIRCLE_RADIUS}
              fill="none"
              stroke={handColors[hand]}
              strokeWidth={STROKE_WIDTH}
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: percent }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <SimpleTooltip
              display={<p className="text-sm font-medium">{(percent * 100).toFixed(2)}%</p>}
              className="cursor-default"
            >
              <p className="text-[14px] font-semibold">{accuracy.toFixed(2)}</p>
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
      className="inline-flex justify-around items-center py-1 px-2 rounded-md w-full backdrop-blur-sm bg-opacity-20"
      style={{ backgroundColor: `${handColors[hand]}40` }}
    >
      <p className="grow min-w-[38px] font-medium">{name}</p>
      <span className="opacity-40 mx-2">|</span>
      <p className="grow text-right font-medium">{value}</p>
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
    <div className="flex flex-col gap-2">
      <AccuracyCircle accuracy={accuracy} averageCut={averageCut} hand={hand} />
      <div
        className={`flex flex-col gap-1 text-sm ${hand === "right" ? "justify-end" : "justify-start"}`}
      >
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
    <div className="flex flex-col gap-6 items-center justify-center p-4 rounded-xl bg-accent-deep border border-border backdrop-blur-sm">
      <div className="flex gap-8 items-center justify-center">
        <HandAccuracy scoreStats={scoreStats.current} hand="left" />
        <HandAccuracy scoreStats={scoreStats.current} hand="right" />
      </div>
      <ScoreAccuracyGrid scoreStats={scoreStats.current} />
    </div>
  );
}
