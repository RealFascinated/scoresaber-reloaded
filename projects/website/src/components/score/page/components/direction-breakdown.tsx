import { CutDirection, ReplayInsights } from "../replay-insights";
import { DIRECTION_NAMES } from "../replay-takeaways";
import SaberCut from "./saber-cut";
import ScorePad, { PadCell } from "./score-pad";

/** The 3x3 pad in screen order. */
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

  return (
    <ScorePad
      title="By Cut Direction"
      description="Average points per hit for blocks you had to cut in each direction."
      columns={3}
      cells={cells}
    />
  );
}
