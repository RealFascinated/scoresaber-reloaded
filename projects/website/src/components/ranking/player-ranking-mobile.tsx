import { getRankBgColor, getRankColor } from "@/common/color-utils";
import { cn } from "@/common/utils";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import CountryFlag from "../country-flag";
import AddFriend from "../friend/add-friend";

type PlayerRankingProps = {
  player: ScoreSaberPlayerToken;
};

export function PlayerRankingMobile({ player }: PlayerRankingProps) {
  const history = player.histories.split(",").map(Number);
  const weeklyRankChange = history[history?.length - 6] - player.rank;

  return (
    <Link href={`/player/${player.id}`}>
      <div className="flex flex-col w-full bg-[#232323] rounded-lg px-2 py-1 mb-1 gap-1 shadow-sm min-h-[40px] hover:bg-[#2d2d2d] transition-all cursor-pointer">
        {/* Top row: Rank, Country Rank, and Weekly Change */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Rank */}
            <div className="flex flex-col items-center min-w-[36px]">
              <span className={cn("font-bold text-base", getRankColor(player.rank))}>
                #{formatNumberWithCommas(player.rank)}
              </span>
            </div>

            {/* Country Rank + Flag */}
            <div className="flex items-center min-w-[48px]">
              <span
                className={cn(
                  "text-xs rounded px-1 py-1 flex items-center gap-1 font-semibold min-h-[22px]",
                  getRankBgColor(player.countryRank)
                )}
              >
                <CountryFlag code={player.country} size={14} />#
                {formatNumberWithCommas(player.countryRank)}
              </span>
            </div>
          </div>

          {/* Weekly Rank Change */}
          <div className="flex items-center min-w-[36px]">
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
        </div>

        {/* Bottom row: Avatar, Name, PP, and Action Button */}
        <div className="flex items-center gap-2">
          {/* Avatar */}
          <div className="flex items-center min-w-[28px]">
            <img
              src={player.profilePicture}
              alt={player.name}
              className="w-7 h-7 rounded-full border border-[#333] object-cover"
            />
          </div>

          {/* Name */}
          <div className="flex items-center min-w-[90px] max-w-[140px] overflow-hidden flex-1">
            <span className="truncate text-white font-medium text-sm">{player.name}</span>
          </div>

          {/* PP */}
          <div className="flex items-center min-w-[70px] ml-auto">
            <span className="text-ssr font-medium text-sm">{formatPp(player.pp)}pp</span>
          </div>

          {/* Add Friend */}
          <div className="size-7 flex items-center justify-center">
            <AddFriend player={player} iconOnly />
          </div>
        </div>
      </div>
    </Link>
  );
}
