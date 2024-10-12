"use client";

import { formatNumberWithCommas, formatPp } from "@/common/number-utils";
import CountryFlag from "@/components/country-flag";
import ScoreSaberPlayerToken from "@ssr/common/types/token/scoresaber/score-saber-player-token";
import Link from "next/link";
import useDatabase from "@/hooks/use-database";
import { useLiveQuery } from "dexie-react-hooks";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { clsx } from "clsx";

type PlayerRankingProps = {
  player: ScoreSaberPlayerToken;
  isCountry: boolean;
};

export function PlayerRanking({ player, isCountry }: PlayerRankingProps) {
  const database = useDatabase();
  const settings = useLiveQuery(() => database.getSettings());

  const history = player.histories.split(",").map(Number);
  const weeklyRankChange = history[history?.length - 6] - player.rank;

  return (
    <>
      <td className="px-4 py-2">
        #{formatNumberWithCommas(isCountry ? player.countryRank : player.rank)}{" "}
        <span className="text-sm">{isCountry && "(#" + formatNumberWithCommas(player.rank) + ")"}</span>
      </td>
      <td className="flex items-center gap-2 px-4 py-2">
        <Avatar className="w-[24px] h-[24px] pointer-events-none">
          <AvatarImage
            alt="Profile Picture"
            src={`https://img.fascinated.cc/upload/w_128,h_128/${player.profilePicture}`}
          />
        </Avatar>
        <CountryFlag code={player.country} size={12} />
        <Link className="transform-gpu transition-all hover:text-blue-500" href={`/player/${player.id}`}>
          <p
            className={
              player.id == settings?.playerId ? "transform-gpu text-pp transition-all hover:brightness-75" : ""
            }
          >
            {player.name}
          </p>
        </Link>
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
        {weeklyRankChange}
      </td>
    </>
  );
}
