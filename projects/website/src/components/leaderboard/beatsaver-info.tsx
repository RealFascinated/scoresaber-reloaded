import Card from "@/components/card";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMap } from "@ssr/common/model/beatsaver/map";
import { getBeatSaverDifficulty } from "@ssr/common/utils/beatsaver.util";
import { formatNumber } from "@ssr/common/utils/number-utils";
import { formatTime } from "@ssr/common/utils/time-utils";
import BeatSaverMapDifficulty from "@ssr/common/model/beatsaver/map-difficulty";
import StatValue from "@/components/stat-value";
import { MapStats } from "@/components/score/map-stats";

type LeaderboardBeatSaverInfoProps = {
  /**
   * The leaderboard to display.
   */
  leaderboard: ScoreSaberLeaderboard;

  /**
   * The beat saver map associated with the leaderboard.
   */
  beatSaverMap: BeatSaverMap;
};

const mapStats = [
  {
    name: "BPM",
    render: (map: BeatSaverMap, difficulty: BeatSaverMapDifficulty) => {
      return formatNumber(map.metadata.bpm);
    },
  },
  {
    name: "Notes",
    render: (map: BeatSaverMap, difficulty: BeatSaverMapDifficulty) => {
      return formatNumber(difficulty.notes);
    },
  },
  {
    name: "NPS",
    render: (map: BeatSaverMap, difficulty: BeatSaverMapDifficulty) => {
      return difficulty.nps.toFixed(2);
    },
  },
  {
    name: "NJS",
    render: (map: BeatSaverMap, difficulty: BeatSaverMapDifficulty) => {
      return difficulty.njs;
    },
  },
  {
    name: "Length",
    render: (map: BeatSaverMap, difficulty: BeatSaverMapDifficulty) => {
      return formatTime(map.metadata.duration);
    },
  },
];

export function LeaderboardBeatSaverInfo({ leaderboard, beatSaverMap }: LeaderboardBeatSaverInfoProps) {
  const difficulty = getBeatSaverDifficulty(
    beatSaverMap,
    leaderboard.songHash,
    leaderboard.difficulty.difficulty,
    leaderboard.difficulty.characteristic
  );
  // Diff not found
  if (!difficulty) {
    return null;
  }

  return (
    <Card className="w-full h-fit text-sm flex gap-2">
      <p className="font-bold text-md text-center">BeatSaver Information</p>
      <div className="w-full p-1 bg-border rounded-sm">
        {beatSaverMap.description.split("\n").map((line, index) => {
          return <p key={index}>{line}</p>;
        })}
      </div>

      <div className="flex gap-1 flex-wrap justify-center">
        <MapStats leaderboard={leaderboard} beatSaver={beatSaverMap} />
      </div>
    </Card>
  );
}
