import { ReplayInsights } from "../replay-insights";
import { describeGridCell } from "../replay-takeaways";
import ScorePad, { PadCell } from "./score-pad";

const LAYERS_TOP_FIRST = [2, 1, 0];

export default function BlockPositionCard({ insights }: { insights: ReplayInsights }) {
  if (!insights.grid.some(cell => cell.cuts > 0)) {
    return null;
  }

  const cells: PadCell[] = LAYERS_TOP_FIRST.flatMap(layer =>
    insights.grid
      .filter(cell => cell.layer === layer)
      .sort((a, b) => a.lane - b.lane)
      .map(cell => ({
        key: `${cell.lane}-${cell.layer}`,
        score: cell.cuts > 0 ? cell.avgScore : undefined,
        cuts: cell.cuts,
        mistakes: cell.mistakes,
        tooltip: `${describeGridCell(cell)}: ${cell.cuts} hits, ${cell.mistakes} misses or bad cuts`,
      }))
  );

  return (
    <ScorePad
      title="By Position"
      description="Average points per hit for each spot on the 4×3 block grid, as you see it in game."
      columns={4}
      cells={cells}
    />
  );
}
