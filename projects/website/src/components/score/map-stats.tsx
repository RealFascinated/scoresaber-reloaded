import StatValue from "@/components/statistic/stat-value";
import { BeatSaverMap } from "@ssr/common/schemas/beatsaver/map/map";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { formatTime } from "@ssr/common/utils/time-utils";
import { SharedIcons } from "@/shared-icons";

type MapAndScoreData = {
  /**
   * The map that the score was set on.
   */
  beatSaver: BeatSaverMap;
};

export function MapStats({ beatSaver }: MapAndScoreData) {
  const metadata = beatSaver.metadata;

  return (
    <div className="flex flex-col gap-2">
      {/* Map Stats */}
      {beatSaver.difficulty && (
        <div className="flex flex-wrap justify-center gap-2">
          <StatValue
            name="Length"
            icon={<SharedIcons.MapLengthStatIcon className="h-4 w-4" />}
            value={formatTime(metadata.duration)}
          />
          <StatValue
            name="BPM"
            icon={<SharedIcons.MapBpmStatIcon className="h-4 w-4" />}
            value={formatNumberWithCommas(metadata.bpm)}
          />
          <StatValue
            name="NPS"
            icon={<SharedIcons.MapNpsStatIcon className="h-4 w-4" />}
            value={beatSaver.difficulty.nps.toFixed(2)}
          />
          <StatValue
            name="NJS"
            icon={<SharedIcons.MapNjsStatIcon className="h-4 w-4" />}
            value={beatSaver.difficulty.njs.toFixed(2)}
          />
          <StatValue
            name="Notes"
            icon={<SharedIcons.MapNotesStatIcon className="h-4 w-4" />}
            value={formatNumberWithCommas(beatSaver.difficulty.notes)}
          />
          <StatValue
            name="Bombs"
            icon={<SharedIcons.MapBombsStatIcon className="h-4 w-4" />}
            value={formatNumberWithCommas(beatSaver.difficulty.bombs)}
          />
          <StatValue
            name="Obstacles"
            icon={<SharedIcons.MapObstaclesStatIcon className="h-4 w-4" />}
            value={formatNumberWithCommas(beatSaver.difficulty.obstacles)}
          />
        </div>
      )}
    </div>
  );
}
