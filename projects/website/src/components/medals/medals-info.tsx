import { SharedIcons } from "@/shared-icons";
import { MEDAL_COUNTS } from "@ssr/common/medal";

export default function MedalsInfo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-foreground">Medal System</h3>
        <p className="text-sm text-muted-foreground">Medals awarded for ranked leaderboard positions</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(MEDAL_COUNTS).map(([rank, count]) => (
          <div
            key={rank}
            className="flex items-center justify-between gap-2 rounded-md bg-control px-2.5 py-2"
          >
            <div className="flex items-center gap-1">
              <SharedIcons.MedalsInfoIcon className="size-3 text-medals" />
              <span className="text-xs font-medium text-foreground tabular-nums">#{rank}</span>
            </div>
            <span className="text-xs text-muted-foreground tabular-nums">
              {count} medal{count !== 1 ? "s" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
