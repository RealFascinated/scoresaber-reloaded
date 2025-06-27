"use client";

import { Spinner } from "@/components/spinner";
import { ScoreSaberLeaderboard } from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import { BeatSaverMapResponse } from "@ssr/common/response/beatsaver-map-response";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { useDebounce } from "@uidotdev/usehooks";
import { AlertCircle, StarIcon, TrendingUpIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import CountUp from "react-countup";
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
          <div className="flex items-center justify-center p-4">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {/* Header with song info */}
            <div className="flex items-center gap-4">
              {leaderboard.songArt && (
                <Image
                  src={leaderboard.songArt}
                  alt={`${leaderboard.songName} Cover Art`}
                  width={96}
                  height={96}
                  className="pointer-events-none size-20 rounded-xl object-cover"
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col justify-center space-y-1">
                <Link
                  href={`/leaderboard/${leaderboard.id}`}
                  className="block truncate text-xl font-bold transition-all hover:brightness-[66%]"
                >
                  {leaderboard.songName}
                </Link>
                <p className="text-muted-foreground truncate text-sm">
                  {leaderboard.songAuthorName}
                </p>
                <p className="text-muted-foreground truncate text-sm">
                  Mapped by {leaderboard.levelAuthorName}
                </p>
              </div>
            </div>

            {/* Stats section */}
            <div className="relative">
              {/* Background gradient effect */}
              <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5" />

              <div className="relative space-y-3 p-3">
                {/* Stats display */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-green-500/20 blur-sm" />
                      <TrendingUpIcon className="relative size-6 text-green-500" />
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs tracking-wide uppercase">Plays</p>
                      <CountUp
                        className="text-lg font-bold"
                        end={leaderboard.plays}
                        duration={1}
                        formattingFn={value => formatNumberWithCommas(value)}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full bg-yellow-500/20 blur-sm" />
                      {leaderboard.ranked ? (
                        <StarIcon className="relative size-6 text-yellow-400" />
                      ) : (
                        <AlertCircle className="relative size-6 text-red-400" />
                      )}
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs tracking-wide uppercase">
                        {leaderboard.ranked ? "Stars" : "Status"}
                      </p>
                      {leaderboard.ranked ? (
                        <CountUp
                          className="text-lg font-bold"
                          end={leaderboard.stars}
                          decimals={2}
                          duration={1}
                        />
                      ) : (
                        <p className="text-lg font-bold text-red-400">Unranked</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Difficulty Info */}
                <div className="border-muted-foreground/30 flex items-center justify-center gap-2 rounded-lg border border-dashed p-2">
                  <div className="relative">
                    <div className="absolute inset-0 animate-pulse rounded-full bg-blue-500/20 blur-sm" />
                    <div
                      className="relative size-4 rounded-full"
                      style={{
                        backgroundColor: getDifficulty(leaderboard.difficulty.difficulty).color,
                      }}
                    />
                  </div>
                  <span
                    className="font-medium"
                    style={{ color: getDifficulty(leaderboard.difficulty.difficulty).color }}
                  >
                    {getDifficultyName(leaderboard.difficulty.difficulty)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
