"use client";

import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import { clsx } from "clsx";
import { TablePlayer } from "@/components/table-player";

type PlayerRankingProps = {
  player: ScoreSaberPlayerToken;
  isCountry: boolean;
};

export function PlayerRanking({ player, isCountry }: PlayerRankingProps) {
  const database = useDatabase();
  const claimedPlayer = useLiveQuery(() => database.getClaimedPlayer());

  const history = player.histories.split(",").map(Number);
  const weeklyRankChange = history[history?.length - 6] - player.rank;

  return (
    <>
      <td className="px-4 py-2">
        #{formatNumberWithCommas(isCountry ? player.countryRank : player.rank)}{" "}
        <span className="text-sm">{isCountry && "(#" + formatNumberWithCommas(player.rank) + ")"}</span>
      </td>
      <td className="flex items-center gap-2 px-4 py-2">
        <TablePlayer player={player} claimedPlayer={claimedPlayer} />
      </td>
      <td className="px-4 py-2 text-pp text-center">{formatPp(player.pp)}pp</td>
      <td className="px-4 py-2 text-center">{formatNumberWithCommas(player.scoreStats.totalPlayCount)}</td>
      <td className="px-4 py-2 text-center">{formatNumberWithCommas(player.scoreStats.rankedPlayCount)}</td>
      <td className="px-4 py-2 text-center">{player.scoreStats.averageRankedAccuracy.toFixed(2) + "%"}</td>
      <td
        className={clsx(
          "px-4 py-2 text-center",
          weeklyRankChange >= 0 ? weeklyRankChange != 0 && "text-green-500" : "text-red-500"
        )}
      >
        {formatNumberWithCommas(weeklyRankChange)}
      </td>
    </>
  );
}
