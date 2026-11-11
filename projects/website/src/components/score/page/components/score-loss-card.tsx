import Card from "@/components/card";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatTime } from "@ssr/common/utils/time-utils";
import { ReplayInsights } from "../replay-insights";

const SEGMENTS = [
  {
    key: "center",
    label: "Not hitting the middle of the block",
    color: "var(--warning)",
  },
  { key: "preSwing", label: "Not swinging far enough back before the hit", color: "var(--hands-right)" },
  { key: "postSwing", label: "Not following through after the hit", color: "var(--info)" },
  { key: "missedOrBad", label: "Misses and bad cuts", color: "var(--danger)" },
] as const;

export default function ScoreLossCard({ insights }: { insights: ReplayInsights }) {
  const { loss, weakMoments } = insights;

  return (
    <Card className="flex-1 gap-4 rounded-xl">
      <div>
        <h3 className="font-semibold">Where You Lost Points</h3>
        <p className="text-muted-foreground text-xs">
          {formatNumberWithCommas(Math.round(loss.total))} points were left on the table compared to a perfect
          play of this map.
        </p>
      </div>

      {loss.total > 0 && (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full">
            {SEGMENTS.map(segment => (
              <div
                key={segment.key}
                style={{
                  width: `${(loss[segment.key] / loss.total) * 100}%`,
                  backgroundColor: segment.color,
                }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2.5">
            {SEGMENTS.map(segment => (
              <div key={segment.key} className="flex items-start justify-between gap-3 text-sm">
                <span className="flex items-start gap-2">
                  <span
                    className="mt-1 size-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: segment.color }}
                  />
                  {segment.label}
                </span>
                <span className="shrink-0 font-semibold tabular-nums">
                  {((loss[segment.key] / loss.total) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {weakMoments.length > 0 && (
        <div className="border-border/50 flex flex-col gap-1.5 border-t pt-3">
          <h4 className="text-muted-foreground text-xs font-semibold">Roughest moments</h4>
          {weakMoments.map(moment => (
            <div
              key={moment.start}
              className="bg-control ring-border flex items-center justify-between rounded-lg px-3 py-1.5 text-sm ring-1"
            >
              <span className="tabular-nums">
                {formatTime(Math.floor(moment.start))} – {formatTime(Math.ceil(moment.end))}
              </span>
              <span className="text-muted-foreground text-xs tabular-nums">
                {Math.round(moment.pointsLost)} points lost
                {moment.misses > 0 ? ` · ${moment.misses} miss${moment.misses === 1 ? "" : "es"}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
