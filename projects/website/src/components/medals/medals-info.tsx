import { MEDAL_COUNTS } from "@ssr/common/medal";
import { FaMedal } from "react-icons/fa";

export default function MedalsInfo() {
  return (
    <div className="flex flex-col gap-3 p-1">
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-white">Medal System</span>
        <span className="text-muted-foreground text-xs">Medals awarded for ranked leaderboard positions</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(MEDAL_COUNTS).map(([rank, count]) => (
          <div key={rank} className="bg-background/50 flex items-center justify-between gap-2 rounded-md p-2">
            <div className="flex items-center gap-1">
              <FaMedal className="size-3 text-yellow-400" />
              <span className="text-xs font-medium text-white">#{rank}</span>
            </div>
            <span className="text-muted-foreground text-xs">
              {count} medal{count !== 1 ? "s" : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
