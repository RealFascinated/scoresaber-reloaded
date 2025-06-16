"use client";

import { getRankBgColor, getRankColor } from "@/common/color-utils";
import { cn } from "@/common/utils";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { formatChange } from "@ssr/common/utils/utils";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import CountryFlag from "../country-flag";
import AddFriend from "../friend/add-friend";
import PlayerPreview from "../player/player-preview";
import SimpleTooltip from "../simple-tooltip";

type PlayerRankingProps = {
  player: ScoreSaberPlayerToken;
  mainPlayer?: ScoreSaberPlayer;
  relativePerformancePoints: boolean;
};

export function PlayerRanking({
  player,
  mainPlayer,
  relativePerformancePoints,
}: PlayerRankingProps) {
  const history = player.histories.split(",").map(Number);
  const weeklyRankChange = history[history?.length - 6] - player.rank;
  const ppDifference = mainPlayer ? player.pp - mainPlayer.pp : 0;

  return (
    <Link href={`/player/${player.id}`}>
      <PlayerPreview
        playerId={player.id}
        className="grid grid-cols-[48px_50px_60px_32px_1fr_90px_40px] items-center w-full bg-[#232323] rounded-lg px-2 py-1 mb-1 gap-3 shadow-sm min-h-[40px] hover:bg-[#2d2d2d] transition-all cursor-pointer"
        delay={750}
        useLink={false}
      >
        {/* Rank */}
        <div className="flex flex-col items-center">
          <span className={cn("font-bold text-base", getRankColor(player.rank))}>
            #{formatNumberWithCommas(player.rank)}
          </span>
        </div>

        {/* Weekly Rank Change */}
        <SimpleTooltip display={<p>Weekly Rank Change</p>}>
          {weeklyRankChange >= -999 && weeklyRankChange <= 999 && (
            <div className="flex items-center">
              {weeklyRankChange > 0 && <ArrowUpRightIcon className="w-4 h-4 text-green-500" />}
              {weeklyRankChange < 0 && <ArrowDownRightIcon className="w-4 h-4 text-red-500" />}
              {weeklyRankChange !== 0 && (
                <span
                  className={cn(
                    "ml-1 font-semibold text-xs",
                    weeklyRankChange > 0 ? "text-green-500" : "text-red-500"
                  )}
                >
                  {formatNumberWithCommas(Math.abs(weeklyRankChange))}
                </span>
              )}
            </div>
          )}
        </SimpleTooltip>

        {/* Country Rank + Flag */}
        <div className="flex items-center">
          <span
            className={cn(
              "text-xs rounded px-1 py-1 flex items-center gap-1 font-semibold min-h-[22px]",
              getRankBgColor(player.countryRank)
            )}
          >
            <CountryFlag code={player.country} size={12} />#
            {formatNumberWithCommas(player.countryRank)}
          </span>
        </div>

        {/* Avatar */}
        <div className="flex items-center">
          <img
            src={player.profilePicture}
            alt={player.name}
            className="w-7 h-7 rounded-full border border-[#333] object-cover"
          />
        </div>

        {/* Name */}
        <div className="flex items-center overflow-hidden">
          <span className="truncate text-white font-medium text-sm">{player.name}</span>
        </div>

        {/* PP */}
        <div className="flex items-center justify-end">
          <span className="text-ssr font-medium text-sm">{formatPp(player.pp)}pp</span>
          {relativePerformancePoints && mainPlayer && (
            <span
              className={cn(
                "text-xs font-medium ml-2",
                ppDifference >= 0 ? ppDifference !== 0 && "text-green-500" : "text-red-500"
              )}
            >
              {formatChange(ppDifference, (num: number) => {
                return formatPp(num) + "pp";
              })}
            </span>
          )}
        </div>

        {/* Add Friend */}
        <div className="size-7 flex items-center justify-center">
          <AddFriend player={player} iconOnly />
        </div>
      </PlayerPreview>
    </Link>
  );
}
