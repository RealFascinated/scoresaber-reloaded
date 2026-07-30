import { SharedIcons } from "@/shared-icons";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatTime } from "@ssr/common/utils/time-utils";

type MapAndScoreData = {
  /**
   * The map that the score was set on.
   */
  beatSaver: BeatSaverMap;
};

export function MapStats({ beatSaver }: MapAndScoreData) {
  const metadata = beatSaver.metadata;

  if (!beatSaver.difficulty) {
    return null;
  }

  return (
    <div className="text-muted-foreground flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs">
      <span className="flex items-center gap-1.5">
        <SharedIcons.MapLengthStatIcon className="size-3.5" />
        <span className="text-foreground font-semibold tabular-nums">{formatTime(metadata.duration)}</span>
        <span>Length</span>
      </span>
      <span className="flex items-center gap-1.5">
        <SharedIcons.MapBpmStatIcon className="size-3.5" />
        <span className="text-foreground font-semibold tabular-nums">
          {formatNumberWithCommas(metadata.bpm)}
        </span>
        <span>BPM</span>
      </span>
      <span className="flex items-center gap-1.5">
        <SharedIcons.MapNpsStatIcon className="size-3.5" />
        <span className="text-foreground font-semibold tabular-nums">
          {beatSaver.difficulty.nps.toFixed(2)}
        </span>
        <span>NPS</span>
      </span>
      <span className="flex items-center gap-1.5">
        <SharedIcons.MapNjsStatIcon className="size-3.5" />
        <span className="text-foreground font-semibold tabular-nums">
          {beatSaver.difficulty.njs.toFixed(2)}
        </span>
        <span>NJS</span>
      </span>
      <span className="flex items-center gap-1.5">
        <SharedIcons.MapNotesStatIcon className="size-3.5" />
        <span className="text-foreground font-semibold tabular-nums">
          {formatNumberWithCommas(beatSaver.difficulty.notes)}
        </span>
        <span>Notes</span>
      </span>
      <span className="flex items-center gap-1.5">
        <SharedIcons.MapBombsStatIcon className="size-3.5" />
        <span className="text-foreground font-semibold tabular-nums">
          {formatNumberWithCommas(beatSaver.difficulty.bombs)}
        </span>
        <span>Bombs</span>
      </span>
      <span className="flex items-center gap-1.5">
        <SharedIcons.MapObstaclesStatIcon className="size-3.5" />
        <span className="text-foreground font-semibold tabular-nums">
          {formatNumberWithCommas(beatSaver.difficulty.obstacles)}
        </span>
        <span>Obstacles</span>
      </span>
    </div>
  );
}
