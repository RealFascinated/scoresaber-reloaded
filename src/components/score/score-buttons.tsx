"use client";

import { copyToClipboard } from "@/common/browser-utils";
import BeatSaverMap from "@/common/database/types/beatsaver-map";
import { songNameToYouTubeLink } from "@/common/youtube-utils";
import BeatSaverLogo from "@/components/logos/beatsaver-logo";
import YouTubeLogo from "@/components/logos/youtube-logo";
import { useToast } from "@/hooks/use-toast";
import { Dispatch, SetStateAction } from "react";
import LeaderboardButton from "./leaderboard-button";
import ScoreButton from "./score-button";
import ScoreSaberLeaderboardToken from "@/common/model/token/scoresaber/score-saber-leaderboard-token";

type Props = {
  leaderboard: ScoreSaberLeaderboardToken;
  beatSaverMap?: BeatSaverMap;
  alwaysSingleLine?: boolean;
  isLeaderboardExpanded?: boolean;
  setIsLeaderboardExpanded?: Dispatch<SetStateAction<boolean>>;
};

export default function ScoreButtons({
  leaderboard,
  beatSaverMap,
  alwaysSingleLine,
  isLeaderboardExpanded,
  setIsLeaderboardExpanded,
}: Props) {
  const { toast } = useToast();

  return (
    <div className="flex justify-end gap-2">
      <div
        className={`flex ${alwaysSingleLine ? "flex-nowrap" : "flex-wrap"} items-center lg:items-start justify-center lg:justify-end gap-1`}
      >
        {beatSaverMap != undefined && (
          <>
            {/* Copy BSR */}
            <ScoreButton
              onClick={() => {
                toast({
                  title: "Copied!",
                  description: `Copied "!bsr ${beatSaverMap.bsr}" to your clipboard!`,
                });
                copyToClipboard(`!bsr ${beatSaverMap.bsr}`);
              }}
              tooltip={<p>Click to copy the bsr code</p>}
            >
              <p>!</p>
            </ScoreButton>

            {/* Open map in BeatSaver */}
            <ScoreButton
              onClick={() => {
                window.open(`https://beatsaver.com/maps/${beatSaverMap.bsr}`, "_blank");
              }}
              tooltip={<p>Click to open the map</p>}
            >
              <BeatSaverLogo />
            </ScoreButton>
          </>
        )}

        {/* Open song in YouTube */}
        <ScoreButton
          onClick={() => {
            window.open(
              songNameToYouTubeLink(leaderboard.songName, leaderboard.songSubName, leaderboard.songAuthorName),
              "_blank"
            );
          }}
          tooltip={<p>Click to open the song in YouTube</p>}
        >
          <YouTubeLogo />
        </ScoreButton>
      </div>
      {isLeaderboardExpanded && setIsLeaderboardExpanded && (
        <LeaderboardButton
          isLeaderboardExpanded={isLeaderboardExpanded}
          setIsLeaderboardExpanded={setIsLeaderboardExpanded}
        />
      )}
    </div>
  );
}
