import { SharedIcons } from "@/shared-icons";
import { MEDAL_COUNTS } from "@ssr/common/medal";

export default function MedalsInfo() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-foreground text-lg font-semibold">Medal System</h3>
        <p className="text-muted-foreground text-sm">Medals awarded for ranked leaderboard positions</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(MEDAL_COUNTS).map(([rank, count]) => (
          <div
            key={rank}
            className="bg-control flex items-center justify-between gap-2 rounded-md px-2.5 py-2"
          >
            <div className="flex items-center gap-1">
              <SharedIcons.MedalsInfoIcon className="text-medals size-3" />
              <span className="text-foreground text-xs font-medium tabular-nums">#{rank}</span>
            </div>
            <span className="text-muted-foreground text-xs tabular-nums">
              {count} medal{count !== 1 ? "s" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
