import Card from "@/components/card";
import EmbedLinks from "@/components/embed-links";
import { MapStats } from "@/components/score/map-stats";
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
    <Card className="flex h-fit w-full gap-2 text-sm">
      <div className="bg-border w-full rounded-sm p-1 break-all">
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
            className="text-center text-xs text-gray-400 transition-all hover:brightness-75"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show Less" : "Show More"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-1">
        <MapStats beatSaver={beatSaverMap} />
      </div>
    </Card>
  );
}
