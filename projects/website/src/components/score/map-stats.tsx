import StatValue from "@/components/stat-value";
import { formatTime } from "@ssr/common/utils/time-utils";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { BombIcon, BrickWallIcon, DrumIcon, GaugeIcon, MusicIcon, TimerIcon } from "lucide-react";
import { CubeIcon } from "@heroicons/react/24/solid";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";

type MapAndScoreData = {
  /**
   * The map that the score was set on.
   */
  beatSaver: BeatSaverMapResponse;
};

export function MapStats({ beatSaver }: MapAndScoreData) {
  const metadata = beatSaver.metadata;

  return (
    <div className="flex flex-col gap-2">
      {/* Map Stats */}
      {beatSaver && (
        <div className="flex flex-wrap gap-2 justify-center">
          <StatValue
            name="Length"
            icon={<TimerIcon className="w-4 h-4" />}
            value={formatTime(metadata.duration)}
          />
          <StatValue
            name="BPM"
            icon={<MusicIcon className="w-4 h-4" />}
            value={formatNumberWithCommas(metadata.bpm)}
          />
          <StatValue
            name="NPS"
            icon={<DrumIcon className="w-4 h-4" />}
            value={beatSaver.difficulty.nps.toFixed(2)}
          />
          <StatValue
            name="NJS"
            icon={<GaugeIcon className="w-4 h-4" />}
            value={beatSaver.difficulty.njs.toFixed(2)}
          />
          <StatValue
            name="Notes"
            icon={<CubeIcon className="w-4 h-4" />}
            value={formatNumberWithCommas(beatSaver.difficulty.notes)}
          />
          <StatValue
            name="Bombs"
            icon={<BombIcon className="w-4 h-4" />}
            value={formatNumberWithCommas(beatSaver.difficulty.bombs)}
          />
          <StatValue
            name="Obstacles"
            icon={<BrickWallIcon className="w-4 h-4" />}
            value={formatNumberWithCommas(beatSaver.difficulty.obstacles)}
          />
        </div>
      )}
    </div>
  );
}
