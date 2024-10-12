"use client";

import BeatSaverMap from "@/common/database/types/beatsaver-map";
import { songNameToYouTubeLink } from "@/common/youtube-utils";
import BeatSaverLogo from "@/components/logos/beatsaver-logo";
import YouTubeLogo from "@/components/logos/youtube-logo";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import ScoreButton from "./score-button";
import { copyToClipboard } from "@/common/browser-utils";
import ScoreSaberLeaderboardToken from "@ssr/common/types/token/scoresaber/score-saber-leaderboard-token";
import { Button } from "@/components/ui/button";
import { ArrowDownIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import ScoreEditorButton from "@/components/score/score-editor-button";
import ScoreSaberScoreToken from "@ssr/common/types/token/scoresaber/score-saber-score-token";

type Props = {
  score?: ScoreSaberScoreToken;
  leaderboard: ScoreSaberLeaderboardToken;
  beatSaverMap?: BeatSaverMap;
  alwaysSingleLine?: boolean;
  setIsLeaderboardExpanded?: (isExpanded: boolean) => void;
  setScore?: (score: ScoreSaberScoreToken) => void;
};

export default function ScoreButtons({
  score,
  leaderboard,
  beatSaverMap,
  alwaysSingleLine,
  setIsLeaderboardExpanded,
  setScore,
}: Props) {
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);
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
      <div className={`flex ${alwaysSingleLine ? "flex-row" : "flex-row lg:flex-col"} items-center justify-center`}>
        {/* Edit score button */}
        {score && leaderboard && setScore && (
          <ScoreEditorButton score={score} leaderboard={leaderboard} setScore={setScore} />
        )}

        {/* View Leaderboard button */}
        {leaderboardExpanded != undefined && setIsLeaderboardExpanded != undefined && (
          <div className="pr-2 flex items-center justify-center cursor-default">
            <Button
              className="p-0 hover:bg-transparent"
              variant="ghost"
              onClick={() => {
                setLeaderboardExpanded(!leaderboardExpanded);
                setIsLeaderboardExpanded?.(!leaderboardExpanded);
              }}
            >
              <ArrowDownIcon
                className={clsx("w-6 h-6 transition-all transform-gpu", leaderboardExpanded ? "" : "rotate-180")}
              />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
