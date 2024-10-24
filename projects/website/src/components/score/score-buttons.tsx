"use client";

import { songNameToYouTubeLink } from "@/common/youtube-utils";
import BeatSaverLogo from "@/components/logos/beatsaver-logo";
import YouTubeLogo from "@/components/logos/youtube-logo";
import { useToast } from "@/hooks/use-toast";
import * as React from "react";
import { useState } from "react";
import ScoreButton from "./score-button";
import { copyToClipboard } from "@/common/browser-utils";
import { ArrowDownIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import clsx from "clsx";
import ScoreEditorButton from "@/components/score/score-editor-button";
import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMap } from "@ssr/common/model/beatsaver/map";
import BeatSaberPepeLogo from "@/components/logos/beatsaber-pepe-logo";

type Props = {
  score?: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMap;
  alwaysSingleLine?: boolean;
  isLeaderboardLoading?: boolean;
  setIsLeaderboardExpanded?: (isExpanded: boolean) => void;
  updateScore?: (score: ScoreSaberScore) => void;
};

export default function ScoreButtons({
  score,
  leaderboard,
  beatSaverMap,
  alwaysSingleLine,
  isLeaderboardLoading,
  setIsLeaderboardExpanded,
  updateScore,
}: Props) {
  const [leaderboardExpanded, setLeaderboardExpanded] = useState(false);
  const { toast } = useToast();

  const additionalData = score?.additionalData;
  return (
    <div className={`flex justify-end gap-2 items-center`}>
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

        {additionalData != undefined && (
          <>
            {/* Open score replay */}
            <ScoreButton
              onClick={() => {
                window.open(`https://replay.beatleader.xyz/?scoreId=${additionalData.scoreId}`, "_blank");
              }}
              tooltip={<p>Click to view the score replay!</p>}
            >
              <BeatSaberPepeLogo />
            </ScoreButton>
          </>
        )}
      </div>
      <div
        className={`flex gap-2 ${alwaysSingleLine ? "flex-row" : "flex-row lg:flex-col"} items-center justify-center`}
      >
        {/* Edit score button */}
        {score && leaderboard && updateScore && (
          <ScoreEditorButton score={score} leaderboard={leaderboard} updateScore={updateScore} />
        )}

        {/* View Leaderboard button */}
        {leaderboardExpanded != undefined && setIsLeaderboardExpanded != undefined && (
          <div className="flex items-center justify-center cursor-default">
            {isLeaderboardLoading ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowDownIcon
                className={clsx(
                  "w-6 h-6 transition-all transform-gpu cursor-pointer",
                  leaderboardExpanded ? "" : "rotate-180"
                )}
                onClick={() => {
                  setLeaderboardExpanded(!leaderboardExpanded);
                  setIsLeaderboardExpanded?.(!leaderboardExpanded);
                }}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
