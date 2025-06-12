"use client";

import { cn } from "@/common/utils";
import AddFriend from "@/components/friend/add-friend";
import { PlayerInfo } from "@/components/player/player-info";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { formatChange } from "@ssr/common/utils/utils";
import { clsx } from "clsx";
import PlayerPreview from "../player/player-preview";

type PlayerRankingProps = {
  player: ScoreSaberPlayerToken;
  mainPlayer?: ScoreSaberPlayer;
  isCountry: boolean;
  relativePerformancePoints: boolean;
};

export function PlayerRanking({
  player,
  mainPlayer,
  isCountry,
  relativePerformancePoints,
}: PlayerRankingProps) {
  const history = player.histories.split(",").map(Number);
  const weeklyRankChange = history[history?.length - 6] - player.rank;
  const ppDifference = mainPlayer ? player.pp - mainPlayer.pp : 0;

  return (
    <>
      <td className="px-4 py-2 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="text-foreground/90">
            #{formatNumberWithCommas(isCountry ? player.countryRank : player.rank)}
          </span>
          {isCountry && (
            <span className="text-xs text-muted-foreground/70">
              (#{formatNumberWithCommas(player.rank)})
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-2 min-w-[280px]">
        <div className="flex items-center gap-3">
          <PlayerPreview playerId={player.id}>
            <PlayerInfo player={player} highlightedPlayerId={mainPlayer?.id} useLink />
          </PlayerPreview>
        </div>
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-ssr font-medium">{formatPp(player.pp)}pp</span>
          {relativePerformancePoints && mainPlayer && (
            <span
              className={cn(
                "text-sm font-medium",
                ppDifference >= 0 ? ppDifference != 0 && "text-green-500" : "text-red-500"
              )}
            >
              {formatChange(ppDifference, num => {
                return formatPp(num) + "pp";
              })}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-2 text-center font-medium">
        {formatNumberWithCommas(player.scoreStats.totalPlayCount)}
      </td>
      <td className="px-4 py-2 text-center font-medium">
        {formatNumberWithCommas(player.scoreStats.rankedPlayCount)}
      </td>
      <td className="px-4 py-2 text-center font-medium">
        {player.scoreStats.averageRankedAccuracy.toFixed(2)}%
      </td>
      <td className="px-4 py-2">
        <div className="flex justify-center">
          <span
            className={clsx(
              "font-medium",
              weeklyRankChange >= 0 ? weeklyRankChange != 0 && "text-green-500" : "text-red-500"
            )}
          >
            {weeklyRankChange == 0 ? 0 : formatChange(weeklyRankChange, formatNumberWithCommas)}
          </span>
        </div>
      </td>
      <td className="px-4 py-2">
        <div className="flex justify-center">
          <AddFriend player={player} iconOnly />
        </div>
      </td>
    </>
  );
}
