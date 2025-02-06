import Card from "@/components/card";
import { MapStats } from "@/components/score/map-stats";
import EmbedLinks from "@/components/embed-links";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { useState } from "react";

type LeaderboardBeatSaverInfoProps = {
  /**
   * The beat saver map associated with the leaderboard.
   */
  beatSaverMap: BeatSaverMapResponse;
};

const descriptionMaxSize = 300;

export function LeaderboardBeatSaverInfo({ beatSaverMap }: LeaderboardBeatSaverInfoProps) {
  const description = beatSaverMap.description;
  const showExpandButton = description.length > descriptionMaxSize;

  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="w-full h-fit text-sm flex gap-2">
      <p className="font-bold text-md text-center">BeatSaver Information</p>
      <div className="w-full p-1 bg-border rounded-sm break-all">
        {(showExpandButton && !expanded
          ? description.slice(0, descriptionMaxSize) + "..."
          : description
        )
          .split("\n")
          .map((line, index) => {
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
