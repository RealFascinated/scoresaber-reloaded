import React from "react";
import { ScoreStatsToken } from "@ssr/common/types/token/beatleader/score-stats/score-stats";
import Tooltip from "@/components/tooltip";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import ScoreAccuracyGrid from "@/components/score/score-accuracy-grid";

type ScoreAccuracyStatProps = {
  scoreStats: ScoreStatsToken;
};

type Hand = "left" | "right";
const handColors: Record<Hand, string> = {
  left: "#a82020",
  right: "#2064a8",
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
    <div>
      {cuts.map((cut, i) => (
        <div key={i} className={`flex gap-1 ${hand === "right" ? "justify-end" : "justify-start"}`}>
          <p>{cut.toFixed(2)}</p>
        </div>
      ))}
    </div>
  );
}

function AccuracyCircle({ accuracy, averageCut, hand }: AccuracyCircleProps) {
  const percent = Math.min(Math.max(accuracy, 0), MAX_ACCURACY) / MAX_ACCURACY;
  const circumference = 2 * Math.PI * CIRCLE_RADIUS;
  const strokeDasharray = `${circumference * percent} ${circumference}`;
  const center = CIRCLE_RADIUS + STROKE_WIDTH;
  const size = (CIRCLE_RADIUS + STROKE_WIDTH) * 2;

  return (
    <div className="flex items-center gap-2">
      <div className={`flex gap-1 ${hand === "right" ? "flex-row-reverse" : "flex-row"}`}>
        <AverageCutValues cuts={averageCut} hand={hand} />
        <div className="relative">
          <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={center} cy={center} r={CIRCLE_RADIUS} fill="none" stroke="#374151" strokeWidth={STROKE_WIDTH} />
            <circle
              cx={center}
              cy={center}
              r={CIRCLE_RADIUS}
              fill="none"
              stroke={handColors[hand]}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Tooltip display={<p>{(percent * 100).toFixed(2)}%</p>} className="cursor-default">
              <p className="text-[14px]">{accuracy.toFixed(2)}</p>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

function HandStat({ hand, name, value }: { hand: Hand; name: string; value: string }) {
  return (
    <div
      className="inline-flex justify-around items-center py-0.5 px-1 rounded-md w-full"
      style={{ backgroundColor: handColors[hand] }}
    >
      <p className="flex-grow min-w-[38px]">{name}</p>
      <span className="opacity-60 mx-2">|</span>
      <p className="flex-grow text-right">{value}</p>
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
  const { accuracy, averageCut, timeDependence, preSwing, postSwing } = useHandStats(scoreStats, hand);
  const tooltipLabel = (text: string) => `${capitalizeFirstLetter(hand)} Hand ${text}`;

  return (
    <div className="flex flex-col gap-2">
      <AccuracyCircle accuracy={accuracy} averageCut={averageCut} hand={hand} />
      <div className={`flex flex-col gap-1 text-sm ${hand === "right" ? "justify-end" : "justify-start"}`}>
        <Tooltip display={tooltipLabel("Time-Dependence")} className="cursor-default">
          <HandStat hand={hand} name="TD" value={`${timeDependence.toFixed(3)}`} />
        </Tooltip>
        <Tooltip display={tooltipLabel("Pre-Swing")} className="cursor-default">
          <HandStat hand={hand} name="Pre" value={`${preSwing.toFixed(2)}%`} />
        </Tooltip>
        <Tooltip display={tooltipLabel("Post-Swing")} className="cursor-default">
          <HandStat hand={hand} name="Post" value={`${postSwing.toFixed(2)}%`} />
        </Tooltip>
      </div>
    </div>
  );
}

export default function ScoreAccuracyStats({ scoreStats }: ScoreAccuracyStatProps) {
  return (
    <div className="flex flex-col gap-3 items-center justify-center">
      <div className="flex gap-3 items-center justify-center">
        <HandAccuracy scoreStats={scoreStats} hand="left" />
        <HandAccuracy scoreStats={scoreStats} hand="right" />
      </div>
      <ScoreAccuracyGrid scoreStats={scoreStats} />
    </div>
  );
}
