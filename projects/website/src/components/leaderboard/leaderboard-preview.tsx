"use client";

import { LoadingIcon } from "@/components/loading-icon";
import { ChartBarIcon, ClockIcon } from "@heroicons/react/24/solid";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getDifficultyName } from "@ssr/common/utils/song-utils";
import { formatDate } from "@ssr/common/utils/time-utils";
import { useDebounce } from "@uidotdev/usehooks";
import { StarIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

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
        className="w-[380px] p-0"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
      >
        {!leaderboard ? (
          <div className="flex justify-center items-center p-4">
            <LoadingIcon />
          </div>
        ) : (
          <div className="p-3">
            {/* Header with song info */}
            <div className="mb-3">
              <div className="flex items-center gap-3">
                {leaderboard.songArt && (
                  <Image
                    src={leaderboard.songArt}
                    alt={`${leaderboard.songName} Cover Art`}
                    width={64}
                    height={64}
                    className="w-16 h-16 rounded-lg object-cover pointer-events-none"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <Link
                    prefetch={false}
                    href={`/leaderboard/${leaderboard.id}`}
                    className="block font-bold text-lg hover:brightness-[66%] transition-all truncate"
                  >
                    {leaderboard.songName}
                  </Link>
                  <p className="text-sm text-gray-400 truncate">{leaderboard.songAuthorName}</p>
                  <p className="text-sm text-gray-400 truncate">
                    Mapped by {leaderboard.levelAuthorName}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              {/* Difficulty */}
              <div className="flex items-center gap-2 bg-accent/50 p-2 rounded">
                <ChartBarIcon className="h-5 w-5 text-gray-400" />
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs">Difficulty</p>
                  <p className="truncate">{getDifficultyName(leaderboard.difficulty.difficulty)}</p>
                </div>
              </div>

              {/* Stars */}
              <div className="flex items-center gap-2 bg-accent/50 p-2 rounded">
                <StarIcon className="h-5 w-5 text-yellow-400" />
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs">Stars</p>
                  <p className="truncate">
                    {leaderboard.ranked ? leaderboard.stars.toFixed(2) : "Unranked"}
                  </p>
                </div>
              </div>

              {/* Max Score */}
              <div className="flex items-center gap-2 bg-accent/50 p-2 rounded">
                <div className="min-w-0 flex-1">
                  <p className="text-gray-400 text-xs">Max Score</p>
                  <p className="truncate">{formatNumberWithCommas(leaderboard.maxScore)}</p>
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-center gap-2 bg-accent/50 p-2 rounded">
                <ClockIcon className="h-5 w-5 text-gray-400" />
                <div className="min-w-0">
                  <p className="text-gray-400 text-xs">Created</p>
                  <p className="truncate">{formatDate(leaderboard.timestamp)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
