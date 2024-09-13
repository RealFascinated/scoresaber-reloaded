"use client";

import { copyToClipboard } from "@/common/browser-utils";
import ScoreSaberPlayerScore from "@/common/service/types/scoresaber/scoresaber-player-score";
import BeatSaverMap from "@/common/database/types/beatsaver-map";
import { songNameToYouTubeLink } from "@/common/youtube-utils";
import BeatSaverLogo from "@/components/logos/beatsaver-logo";
import YouTubeLogo from "@/components/logos/youtube-logo";
import { useToast } from "@/hooks/use-toast";
import { Dispatch, SetStateAction } from "react";
import LeaderboardButton from "./leaderboard-button";
import ScoreButton from "./score-button";

type Props = {
  playerScore: ScoreSaberPlayerScore;
  beatSaverMap?: BeatSaverMap;
  isLeaderboardExpanded: boolean;
  setIsLeaderboardExpanded: Dispatch<SetStateAction<boolean>>;
};

export default function ScoreButtons({
  playerScore,
  beatSaverMap,
  isLeaderboardExpanded,
  setIsLeaderboardExpanded,
}: Props) {
  const { leaderboard } = playerScore;
  const { toast } = useToast();

  return (
    <div className="flex justify-end">
      <LeaderboardButton
        isLeaderboardExpanded={isLeaderboardExpanded}
        setIsLeaderboardExpanded={setIsLeaderboardExpanded}
      />
      <div className="flex flex-row justify-center flex-wrap gap-1 lg:justify-end">
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
                window.open(
                  `https://beatsaver.com/maps/${beatSaverMap.bsr}`,
                  "_blank",
                );
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
              songNameToYouTubeLink(
                leaderboard.songName,
                leaderboard.songSubName,
                leaderboard.songAuthorName,
              ),
              "_blank",
            );
          }}
          tooltip={<p>Click to open the song in YouTube</p>}
        >
          <YouTubeLogo />
        </ScoreButton>
      </div>
    </div>
  );
}
