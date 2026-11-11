import { Colors } from "@/common/colors";
import Card from "@/components/card";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { HandSummary, ReplayInsights } from "../replay-insights";

type Row = {
  label: string;
  value: (hand: HandSummary) => number;
  format: (value: number) => string;
  better: "higher" | "lower";
};

const ROWS: Row[] = [
  { label: "Average points per hit", value: h => h.avgScore, format: v => v.toFixed(2), better: "higher" },
  {
    label: "Great hits (110+)",
    value: h => h.greatShare * 100,
    format: v => `${v.toFixed(0)}%`,
    better: "higher",
  },
  {
    label: "Perfect hits (115)",
    value: h => h.perfectCuts,
    format: v => formatNumberWithCommas(v),
    better: "higher",
  },
  { label: "Misses", value: h => h.misses, format: v => `${v}`, better: "lower" },
  { label: "Bad cuts", value: h => h.badCuts, format: v => `${v}`, better: "lower" },
  { label: "Swing speed", value: h => h.avgSpeed, format: v => `${v.toFixed(1)} m/s`, better: "higher" },
];

export default function HandComparison({ insights }: { insights: ReplayInsights }) {
  const { left, right } = insights.hands;

  return (
    <Card className="gap-3 rounded-xl">
      <div>
        <h3 className="font-semibold">Left Hand vs Right Hand</h3>
        <p className="text-muted-foreground text-xs">The better hand for each row is in bold.</p>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 text-xs font-semibold">
        <span className="text-right" style={{ color: Colors.hands.left }}>
          Left
        </span>
        <span className="w-32 sm:w-40" />
        <span style={{ color: Colors.hands.right }}>Right</span>
      </div>

      <div className="divide-border/50 divide-y">
        {ROWS.map(row => {
          const leftValue = row.value(left);
          const rightValue = row.value(right);
          const tied = Math.abs(leftValue - rightValue) < 0.005;
          const leftWins = row.better === "higher" ? leftValue > rightValue : leftValue < rightValue;
          return (
            <div key={row.label} className="grid grid-cols-[1fr_auto_1fr] items-center gap-x-3 py-2 text-sm">
              <span
                className={`text-right tabular-nums ${!tied && leftWins ? "font-bold" : "text-muted-foreground"}`}
              >
                {row.format(leftValue)}
              </span>
              <span className="text-muted-foreground w-32 text-center text-xs sm:w-40">{row.label}</span>
              <span className={`tabular-nums ${!tied && !leftWins ? "font-bold" : "text-muted-foreground"}`}>
                {row.format(rightValue)}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
