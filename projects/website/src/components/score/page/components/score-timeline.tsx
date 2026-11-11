import { formatTime } from "@ssr/common/utils/time-utils";
import { Hand, ReplayInsights } from "../replay-insights";
import ScoreTimelineChart from "./score-timeline-chart";

const MAX_SCORE = 115;
const TARGET_SLICES = 48;
const FLOOR_SCORE = 80;

type Slice = { sum: Record<Hand, number>; count: Record<Hand, number>; mistakes: number };

/**
 * Averages the score of each hand over short slices of the song so the chart shows the trend
 * instead of one point per note.
 */
export default function ScoreTimeline({ insights }: { insights: ReplayInsights }) {
  const length = Math.max(insights.lengthSeconds, 1);
  const sliceSeconds = Math.max(5, Math.round(length / TARGET_SLICES / 5) * 5);
  const sliceCount = Math.ceil(length / sliceSeconds);

  const slices: Slice[] = Array.from({ length: sliceCount }, () => ({
    sum: { left: 0, right: 0 },
    count: { left: 0, right: 0 },
    mistakes: 0,
  }));

  for (const note of insights.notes) {
    const slice = slices[Math.min(Math.floor(note.time / sliceSeconds), sliceCount - 1)];
    if (note.kind === "good" && note.hand) {
      slice.sum[note.hand] += note.ratio * MAX_SCORE;
      slice.count[note.hand]++;
    } else if (note.kind === "miss" || note.kind === "bad") {
      slice.mistakes++;
    }
  }

  const average = (hand: Hand): (number | null)[] =>
    slices.map(slice => (slice.count[hand] > 0 ? slice.sum[hand] / slice.count[hand] : null));
  const left = average("left");
  const right = average("right");

  const lowest = Math.min(
    ...[...left, ...right].filter((value): value is number => value !== null),
    MAX_SCORE
  );
  const minScore = Math.max(FLOOR_SCORE, Math.floor((lowest - 1) / 5) * 5);

  return (
    <ScoreTimelineChart
      labels={slices.map((_, index) => formatTime(index * sliceSeconds))}
      left={left}
      right={right}
      mistakes={slices.map(slice => slice.mistakes)}
      minScore={minScore}
    />
  );
}
