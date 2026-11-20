import { CutDirection, ReplayInsights } from "@ssr/common/replay/replay-insights";
import { DIRECTION_NAMES } from "@ssr/common/replay/replay-takeaways";
import SaberCut from "./saber-cut";
import ScorePad, { PadCell } from "./score-pad";

const PAD: CutDirection[] = [
  "upLeft",
  "up",
  "upRight",
  "left",
  "dot",
  "right",
  "downLeft",
  "down",
  "downRight",
];

export default function DirectionBreakdown({ insights }: { insights: ReplayInsights }) {
  if (!insights.directions.some(direction => direction.cuts > 0)) {
    return null;
  }

  const cells: PadCell[] = PAD.map(direction => {
    const summary = insights.directions.find(item => item.direction === direction);
    const cuts = summary?.cuts ?? 0;
    return {
      key: direction,
      icon: <SaberCut direction={direction} />,
      score: cuts > 0 ? summary?.avgScore : undefined,
      cuts,
      mistakes: summary?.mistakes ?? 0,
      tooltip: `${DIRECTION_NAMES[direction]} blocks: ${cuts} hits, ${summary?.mistakes ?? 0} misses or bad cuts`,
    };
  });

  return <ScorePad title="By Cut Direction" columns={3} cells={cells} />;
}
