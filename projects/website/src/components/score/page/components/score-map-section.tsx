import { SharedIcons } from "@/shared-icons";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { formatNumber, formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatTime } from "@ssr/common/utils/time-utils";
import { ReactNode } from "react";

function MapStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="bg-card ring-border flex flex-col gap-1.5 rounded-xl p-3 ring-1">
      <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <span className="text-lg leading-none font-bold tabular-nums">{value}</span>
    </div>
  );
}

export default function ScoreMapSection({ beatSaver }: { beatSaver: BeatSaverMap }) {
  const difficulty = beatSaver.difficulty;
  if (!difficulty) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      <MapStat
        icon={<SharedIcons.MapLengthStatIcon className="size-3.5" />}
        label="Length"
        value={formatTime(beatSaver.metadata.duration)}
      />
      <MapStat
        icon={<SharedIcons.MapBpmStatIcon className="size-3.5" />}
        label="BPM"
        value={formatNumberWithCommas(beatSaver.metadata.bpm)}
      />
      <MapStat
        icon={<SharedIcons.MapNpsStatIcon className="size-3.5" />}
        label="NPS"
        value={difficulty.nps.toFixed(2)}
      />
      <MapStat
        icon={<SharedIcons.MapNjsStatIcon className="size-3.5" />}
        label="NJS"
        value={formatNumber(difficulty.njs, "number")}
      />
      <MapStat
        icon={<SharedIcons.MapNotesStatIcon className="size-3.5" />}
        label="Notes"
        value={formatNumberWithCommas(difficulty.notes)}
      />
      <MapStat
        icon={<SharedIcons.MapBombsStatIcon className="size-3.5" />}
        label="Bombs"
        value={formatNumberWithCommas(difficulty.bombs)}
      />
      <MapStat
        icon={<SharedIcons.MapObstaclesStatIcon className="size-3.5" />}
        label="Obstacles"
        value={formatNumberWithCommas(difficulty.obstacles)}
      />
    </div>
  );
}
