import Card from "@/components/card";
import { MapStats } from "@/components/score/map-stats";
import EmbedLinks from "@/components/embed-links";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import BeatSaverMapDifficulty from "@ssr/common/model/beatsaver/map-difficulty";
import { formatNumber } from "@ssr/common/utils/number-utils";
import { formatTime } from "@ssr/common/utils/time-utils";
import { useState } from "react";

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

const descriptionMaxLines = 4;

export function LeaderboardBeatSaverInfo({ beatSaverMap }: LeaderboardBeatSaverInfoProps) {
  const descriptionLines = beatSaverMap.description.split("\n");

  const [expanded, setExpanded] = useState(false);
  const showExpandButton = descriptionLines.length > descriptionMaxLines;

  return (
    <Card className="w-full h-fit text-sm flex gap-2">
      <p className="font-bold text-md text-center">BeatSaver Information</p>
      <div className="w-full p-1 bg-border rounded-sm">
        {(descriptionLines.length > 8 && !expanded
          ? descriptionLines.slice(0, descriptionMaxLines)
          : descriptionLines
        ).map((line, index) => {
          return (
            <p key={index}>
              <EmbedLinks text={line} />
            </p>
          );
        })}

        {showExpandButton && (
          <button
            className="text-xs text-center text-gray-400 hover:brightness-75 transition-all"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show Less" : "Show More"}
          </button>
        )}
      </div>

      <div className="flex gap-1 flex-wrap justify-center">
        <MapStats beatSaver={beatSaverMap} />
      </div>
    </Card>
  );
}
