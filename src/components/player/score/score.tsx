"use client";

import { beatsaverFetcher } from "@/common/data-fetcher/impl/beatsaver";
import ScoreSaberPlayerScore from "@/common/data-fetcher/types/scoresaber/scoresaber-player-score";
import { formatNumberWithCommas } from "@/common/number-utils";
import { songNameToYouTubeLink } from "@/common/song-utils";
import { timeAgo } from "@/common/time-utils";
import YouTubeLogo from "@/components/logos/youtube-logo";
import { useToast } from "@/hooks/use-toast";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import Image from "next/image";
import { useEffect, useState } from "react";
import BeatSaverLogo from "../../logos/beatsaver-logo";
import ScoreButton from "./score-button";

type Props = {
  /**
   * The score to display.
   */
  playerScore: ScoreSaberPlayerScore;
};

export default function Score({ playerScore }: Props) {
  const { score, leaderboard } = playerScore;
  const { toast } = useToast();
  const [bsr, setBsr] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      const bsrFound = await beatsaverFetcher.getMapBsr(leaderboard.songHash);
      setBsr(bsrFound);
    })();
  }, [playerScore]);

  return (
    <div className="grid gap-2 md:gap-0 pb-2 pt-2 first:pt-0 last:pb-0 grid-cols-[20px 1fr_1fr] md:grid-cols-[0.85fr_5fr_1fr_1.2fr]">
      <div className="flex w-full flex-row justify-between items-center md:w-[125px] md:justify-center md:flex-col">
        <div className="flex gap-1 items-center">
          <GlobeAmericasIcon className="w-5 h-5" />
          <p className="text-pp">#{formatNumberWithCommas(score.rank)}</p>
        </div>
        <p className="text-sm">{timeAgo(new Date(score.timeSet))}</p>
      </div>
      <div className="flex gap-3">
        <Image
          unoptimized
          src={leaderboard.coverImage}
          width={64}
          height={64}
          alt="Song Artwork"
          className="rounded-md"
        />
        <div className="flex">
          <div className="flex flex-col">
            <p className="text-pp text-ellipsis">{leaderboard.songName}</p>
            <p className="text-sm text-gray-400 text-ellipsis">{leaderboard.songAuthorName}</p>
            <p className="text-sm text-ellipsis">{leaderboard.levelAuthorName}</p>
          </div>
        </div>
      </div>
      <div className="hidden md:flex flex-row flex-wrap gap-1 justify-end">
        {bsr != undefined && (
          <>
            {/* Copy BSR */}
            <ScoreButton
              onClick={() => {
                toast({
                  title: "Copied!",
                  description: `Copied "!bsr ${bsr}" to your clipboard!`,
                });
              }}
              tooltip={<p>Click to copy the bsr code</p>}
            >
              <p>!</p>
            </ScoreButton>

            {/* Open map in BeatSaver */}
            <ScoreButton
              onClick={() => {
                window.open(`https://beatsaver.com/maps/${bsr}`, "_blank");
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

      <div className="flex justify-end">stats stuff</div>
    </div>
  );
}
