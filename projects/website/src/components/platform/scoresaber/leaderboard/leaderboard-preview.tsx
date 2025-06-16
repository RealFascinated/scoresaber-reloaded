"use client";

import Card from "@/components/card";
import SimpleTooltip from "@/components/simple-tooltip";
import { Spinner } from "@/components/spinner";
import { ClockIcon, MusicalNoteIcon } from "@heroicons/react/24/solid";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDate } from "@ssr/common/utils/time-utils";
import { useDebounce } from "@uidotdev/usehooks";
import { StarIcon, TrendingUpIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../../../ui/popover";

type LeaderboardPreviewProps = {
  leaderboard: ScoreSaberLeaderboard;
  beatSaverMap?: BeatSaverMapResponse;
  children: React.ReactNode;
};

export default function LeaderboardPreview({
  leaderboard,
  beatSaverMap,
  children,
}: LeaderboardPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const state = useDebounce(isOpen, 100);

  return (
    <Popover open={state} onOpenChange={setIsOpen}>
      <PopoverTrigger
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="flex w-fit"
      >
        {children}
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] p-0"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {!leaderboard ? (
          <div className="flex justify-center items-center p-4">
            <Spinner />
          </div>
        ) : (
          <div className="p-3">
            {/* Header with song info */}
            <div className="flex items-center gap-3 mb-3">
              {leaderboard.songArt && (
                <Image
                  src={leaderboard.songArt}
                  alt={`${leaderboard.songName} Cover Art`}
                  width={96}
                  height={96}
                  className="size-24 rounded-lg object-cover pointer-events-none"
                />
              )}
              <div className="min-w-0 flex-1">
                <Link
                  href={`/leaderboard/${leaderboard.id}`}
                  className="block font-bold text-2xl hover:brightness-[66%] transition-all truncate"
                >
                  {leaderboard.songName}
                </Link>
                <p className="text-sm text-muted-foreground truncate">
                  {leaderboard.songAuthorName}
                </p>
                <p className="text-sm text-muted-foreground truncate">
                  Mapped by {leaderboard.levelAuthorName}
                </p>
              </div>
            </div>

            {/* Stats card */}
            <Card className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between">
                {/* Difficulty */}
                <SimpleTooltip display="Song Difficulty">
                  <div className="grid grid-cols-[24px_1fr] gap-2 items-center">
                    <div className="flex items-center justify-center">
                      <MusicalNoteIcon className="size-5 text-muted-foreground min-w-5" />
                    </div>
                    <p>{getDifficultyName(leaderboard.difficulty.difficulty)}</p>
                  </div>
                </SimpleTooltip>

                {/* Stars */}
                <SimpleTooltip display="Star Rating">
                  <div className="flex items-center gap-2">
                    <p>{leaderboard.ranked ? leaderboard.stars.toFixed(2) : "Unranked"}</p>
                    <StarIcon className="size-5 text-yellow-400 min-w-5" />
                  </div>
                </SimpleTooltip>
              </div>

              <div className="flex items-center justify-between">
                {/* Plays */}
                <SimpleTooltip display="Total Plays">
                  <div className="grid grid-cols-[24px_1fr] gap-2 items-center">
                    <div className="flex items-center justify-center">
                      <TrendingUpIcon className="size-5 text-muted-foreground min-w-5" />
                    </div>
                    <p>{formatNumberWithCommas(leaderboard.plays)}</p>
                  </div>
                </SimpleTooltip>

                {/* Created Date */}
                <SimpleTooltip display="Created Date">
                  <div className="flex items-center gap-2">
                    <p>{formatDate(leaderboard.timestamp)}</p>
                    <ClockIcon className="size-5 text-muted-foreground min-w-5" />
                  </div>
                </SimpleTooltip>
              </div>
            </Card>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
