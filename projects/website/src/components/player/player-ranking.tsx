"use client";

import { getRankBgColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getScoreSaberAvatar } from "@ssr/common/utils/scoresaber.util";
import { PlayerAvatar } from "../ranking/player-avatar";
import { PlayerName } from "../ranking/player-name";
import SimpleLink from "../simple-link";
import CountryFlag from "../ui/country-flag";

export function PlayerRanking({
  player,
  firstColumnWidth,
  renderWorth,
}: {
  player: ScoreSaberPlayerToken | ScoreSaberPlayer;
  firstColumnWidth: number;
  renderWorth: () => React.ReactNode;
}) {
  return (
    <SimpleLink href={`/player/${player.id}`}>
      {/* Desktop Layout */}
      <div className="bg-muted/50 hover:bg-accent/50 hidden items-center gap-2 rounded-md px-(--spacing-xs) py-(--spacing-xs) lg:flex">
        {/* Rank, Weekly Change, and Country Rank */}
        <div
          className={cn("grid grid-cols-[0.65fr_1fr] items-center gap-3")}
          style={{
            width: `${firstColumnWidth}px`,
          }}
        >
          <RankDisplay rank={player.rank} />
          <CountryRankDisplay country={player.country} countryRank={player.countryRank} />
        </div>

        {/* Avatar and Name */}
        <div className="flex items-center gap-2">
          <PlayerAvatar profilePicture={getScoreSaberAvatar(player)} name={player.name} />
          <PlayerName player={player} />
        </div>

        {/* Worth */}
        {renderWorth()}
      </div>

      {/* Mobile Layout */}
      <div className="block lg:hidden">
        <div className="bg-muted/50 mb-1 flex min-h-[67px] w-full cursor-pointer flex-col justify-center gap-1 rounded-lg px-2 py-1 shadow-sm transition-all">
          {/* Top row: Rank, Country Rank, and Weekly Change */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RankDisplay rank={player.rank} />
              <CountryRankDisplay country={player.country} countryRank={player.countryRank} />
            </div>
          </div>

          {/* Bottom row: Avatar, Name, PP, and Action Button */}
          <div className="flex items-center gap-2">
            <PlayerAvatar
              profilePicture={getScoreSaberAvatar(player)}
              name={player.name}
              className="flex min-w-[28px] items-center"
            />
            <PlayerName
              player={player}
              className="flex max-w-[140px] min-w-[90px] flex-1 items-center overflow-hidden"
            />
            {/* Worth */}
            {renderWorth()}
          </div>
        </div>
      </div>
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
          "flex h-[24px] items-center gap-1 rounded px-1 py-1 text-xs font-semibold",
          getRankBgColor(countryRank)
        )}
      >
        <CountryFlag code={country} size={10} />
        <span>#{formatNumberWithCommas(countryRank)}</span>
      </div>
    </div>
  );
}
