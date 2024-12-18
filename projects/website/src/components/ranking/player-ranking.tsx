"use client";

import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { clsx } from "clsx";
import { PlayerInfo } from "@/components/player/player-info";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/player";
import { formatChange } from "@ssr/common/utils/utils";
import { cn } from "@/common/utils";

type PlayerRankingProps = {
  player: ScoreSaberPlayerToken;
  claimedPlayer?: ScoreSaberPlayerToken;
  isCountry: boolean;
  relativePerformancePoints: boolean;
};

export function PlayerRanking({ player, claimedPlayer, isCountry, relativePerformancePoints }: PlayerRankingProps) {
  const history = player.histories.split(",").map(Number);
  const weeklyRankChange = history[history?.length - 6] - player.rank;
  const ppDifference = claimedPlayer ? player.pp - claimedPlayer.pp : 0;

  return (
    <>
      <td className="px-2 py-1.5">
        #{formatNumberWithCommas(isCountry ? player.countryRank : player.rank)}{" "}
        {isCountry && <span className="text-xs text-gray-300">(#{formatNumberWithCommas(player.rank)})</span>}
      </td>
      <td className="flex items-center gap-2 pl-3 py-1.5 min-w-[250px]">
        <PlayerInfo player={player} highlightedPlayer={claimedPlayer} useLink />
      </td>
      <td className="px-1 py-1.5 text-center">
        <span className="text-ssr">{formatPp(player.pp)}pp</span>{" "}
        {relativePerformancePoints && claimedPlayer && (
          <span className={cn("text-sm", ppDifference >= 0 ? ppDifference != 0 && "text-green-500" : "text-red-500")}>
            {formatChange(ppDifference, num => {
              return formatPp(num) + "pp";
            })}
          </span>
        )}
      </td>
      <td className="px-1 py-1.5 text-center">{formatNumberWithCommas(player.scoreStats.totalPlayCount)}</td>
      <td className="px-1 py-1.5 text-center">{formatNumberWithCommas(player.scoreStats.rankedPlayCount)}</td>
      <td className="px-1 py-1.5 text-center">{player.scoreStats.averageRankedAccuracy.toFixed(2) + "%"}</td>
      <td
        className={clsx(
          "px-1 py-1.5 text-center",
          weeklyRankChange >= 0 ? weeklyRankChange != 0 && "text-green-500" : "text-red-500"
        )}
      >
        {weeklyRankChange == 0 ? 0 : formatChange(weeklyRankChange, formatNumberWithCommas)}
      </td>
    </>
  );
}
