"use client";

import { getRankBgColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getScoreSaberAvatar } from "@ssr/common/utils/scoresaber.util";
import { FaMedal } from "react-icons/fa";
import PlayerPreview from "../player/player-preview";
import { PlayerAvatar } from "../ranking/player-avatar";
import { PlayerName } from "../ranking/player-name";
import SimpleLink from "../simple-link";
import CountryFlag from "../ui/country-flag";

export function PlayerMedalRanking({
  player,
  firstColumnWidth,
}: {
  player: ScoreSaberPlayer;
  firstColumnWidth: number;
}) {
  return (
    <SimpleLink href={`/player/${player.id}`}>
      <PlayerPreview
        playerId={player.id}
        className="mb-1 grid min-h-[40px] w-full cursor-pointer items-center gap-3 rounded-lg bg-[#232323] px-2 py-1 shadow-sm transition-all hover:bg-[#2d2d2d]"
        style={{
          gridTemplateColumns: `${firstColumnWidth}px 1fr 90px`,
        }}
        delay={750}
        useLink={false}
      >
        {/* Rank, Weekly Change, and Country Rank */}
        <div
          className={cn("grid items-center gap-3", "grid-cols-[0.75fr_1fr]")}
          style={{
            width: `${firstColumnWidth}px`,
          }}
        >
          <RankDisplay rank={player.medalsRank} />
          <CountryRankDisplay country={player.country} countryRank={player.countryMedalsRank} />
        </div>

        {/* Avatar and Name */}
        <div className="flex w-full min-w-0 items-center gap-2">
          <PlayerAvatar profilePicture={getScoreSaberAvatar(player)} name={player.name} />
          <PlayerName player={player} />
        </div>

        {/* Medals */}
        <MedalsDisplay medals={player.medals} />
      </PlayerPreview>
    </SimpleLink>
  );
}

function RankDisplay({ rank }: { rank: number }) {
  return (
    <div
      className={cn(
        "flex h-[24px] w-fit items-center justify-center gap-1 rounded px-1 py-1 text-xs font-semibold",
        getRankBgColor(rank)
      )}
    >
      <span>#{formatNumberWithCommas(rank)}</span>
    </div>
  );
}

function CountryRankDisplay({ country, countryRank }: { country: string; countryRank: number }) {
  return (
    <div className="flex items-center">
      <div
        className={cn(
          "flex min-h-[22px] items-center gap-1 rounded px-1 py-1 text-xs font-semibold",
          getRankBgColor(countryRank)
        )}
      >
        <CountryFlag code={country} size={10} />
        <span>#{formatNumberWithCommas(countryRank)}</span>
      </div>
    </div>
  );
}

function MedalsDisplay({ medals }: { medals: number }) {
  return (
    <div className="flex flex-row items-center justify-end gap-2">
      <FaMedal className="size-4" />
      <p className="text-pp font-semibold">{formatNumberWithCommas(medals)}</p>
    </div>
  );
}
