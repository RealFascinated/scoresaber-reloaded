import { BeatSaverMap } from "@ssr/common/model/beatsaver/map";
import StatValue from "@/components/stat-value";
import { getBeatSaverDifficulty } from "@ssr/common/utils/beatsaver.util";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import { formatTime } from "@ssr/common/utils/time-utils";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { BombIcon, BrickWallIcon, DrumIcon, MusicIcon, TimerIcon } from "lucide-react";
import { BsSpeedometer } from "react-icons/bs";
import { CubeIcon } from "@heroicons/react/24/solid";

type MapAndScoreData = {
  /**
   * The leaderboard that the score was set on.
   */
  leaderboard: ScoreSaberLeaderboard;

  /**
   * The map that the score was set on.
   */
  beatSaver?: BeatSaverMap;
};

export function MapStats({ leaderboard, beatSaver }: MapAndScoreData) {
  const metadata = beatSaver?.metadata;
  const mapDiff = beatSaver
    ? getBeatSaverDifficulty(beatSaver, leaderboard.songHash, leaderboard.difficulty.difficulty)
    : undefined;

  return (
    <div className="flex flex-col gap-2">
      {/* Map Stats */}
      {mapDiff && metadata && (
        <div className="flex flex-wrap gap-2 justify-center">
          <StatValue name="Length" icon={<TimerIcon className="w-4 h-4" />} value={formatTime(metadata.duration)} />
          <StatValue name="BPM" icon={<MusicIcon className="w-4 h-4" />} value={formatNumberWithCommas(metadata.bpm)} />
          <StatValue name="NPS" icon={<DrumIcon className="w-4 h-4" />} value={mapDiff.nps.toFixed(2)} />
          <StatValue name="NJS" icon={<BsSpeedometer className="w-4 h-4" />} value={mapDiff.njs.toFixed(2)} />
          <StatValue
            name="Notes"
            icon={<CubeIcon className="w-4 h-4" />}
            value={formatNumberWithCommas(mapDiff.notes)}
          />
          <StatValue
            name="Bombs"
            icon={<BombIcon className="w-4 h-4" />}
            value={formatNumberWithCommas(mapDiff.bombs)}
          />
          <StatValue name="Obstacles" icon={<BrickWallIcon className="w-4 h-4" />} value={mapDiff.obstacles} />
        </div>
      )}
    </div>
  );
}
