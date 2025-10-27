import Card from "@/components/card";
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
    <Card className="flex h-fit w-full flex-col gap-4 text-sm">
      <div className="bg-muted/30 w-full break-all rounded-lg p-3">
        {(showExpandButton && !expanded
          ? description.slice(0, descriptionMaxSize) + "..."
          : description
        )
          .split("\n")
          .map((line, index) => {
            return (
              <p key={index} className="text-sm">
                <EmbedLinks text={line} />
              </p>
            );
          })}

        {showExpandButton && (
          <button
            className="text-muted-foreground hover:text-foreground mt-2 text-center text-xs transition-all"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Show Less" : "Show More"}
          </button>
        )}
      </div>
    </Card>
  );
}
