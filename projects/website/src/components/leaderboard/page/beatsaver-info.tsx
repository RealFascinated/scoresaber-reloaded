import Card from "@/components/card";
import { MapStats } from "@/components/score/map-stats";
import EmbedLinks from "@/components/embed-links";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import BeatSaverMapDifficulty from "@ssr/common/model/beatsaver/map-difficulty";
import { formatNumber } from "@ssr/common/utils/number-utils";
import { formatTime } from "@ssr/common/utils/time-utils";

type LeaderboardBeatSaverInfoProps = {
  /**
   * The beat saver map associated with the leaderboard.
   */
  beatSaverMap: BeatSaverMapResponse;
};

const mapStats = [
  {
    name: "BPM",
    render: (map: BeatSaverMapResponse, difficulty: BeatSaverMapDifficulty) => {
      return formatNumber(map.metadata.bpm);
    },
  },
  {
    name: "Notes",
    render: (map: BeatSaverMapResponse, difficulty: BeatSaverMapDifficulty) => {
      return formatNumber(difficulty.notes);
    },
  },
  {
    name: "NPS",
    render: (map: BeatSaverMapResponse, difficulty: BeatSaverMapDifficulty) => {
      return difficulty.nps.toFixed(2);
    },
  },
  {
    name: "NJS",
    render: (map: BeatSaverMapResponse, difficulty: BeatSaverMapDifficulty) => {
      return difficulty.njs;
    },
  },
  {
    name: "Length",
    render: (map: BeatSaverMapResponse, difficulty: BeatSaverMapDifficulty) => {
      return formatTime(map.metadata.duration);
    },
  },
];

export function LeaderboardBeatSaverInfo({ beatSaverMap }: LeaderboardBeatSaverInfoProps) {
  return (
    <Card className="w-full h-fit text-sm flex gap-2">
      <p className="font-bold text-md text-center">BeatSaver Information</p>
      <div className="w-full p-1 bg-border rounded-sm">
        {beatSaverMap.description.split("\n").map((line, index) => {
          return (
            <p key={index}>
              <EmbedLinks text={line} />
            </p>
          );
        })}
      </div>

      <div className="flex gap-1 flex-wrap justify-center">
        <MapStats beatSaver={beatSaverMap} />
      </div>
    </Card>
  );
}
