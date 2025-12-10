"use client";

import { getRankBgColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import useDatabase from "@/hooks/use-database";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getScoreSaberAvatar, getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import { useLiveQuery } from "dexie-react-hooks";
import { PlayerAvatar } from "../ranking/player-avatar";
import SimpleLink from "../simple-link";
import CountryFlag from "../ui/country-flag";

export function PlayerRanking({
  player,
  getRank,
  getCountryRank,
  firstColumnWidth,
  renderWorth,
  showAccountInactive = true,
}: {
  player: ScoreSaberPlayerToken | ScoreSaberPlayer;
  getRank: (player: ScoreSaberPlayerToken | ScoreSaberPlayer) => number;
  getCountryRank: (player: ScoreSaberPlayerToken | ScoreSaberPlayer) => number;
  firstColumnWidth: number;
  renderWorth: () => React.ReactNode;
  showAccountInactive?: boolean;
}) {
  const database = useDatabase();
  const mainPlayer = useLiveQuery(() => database.getMainPlayer());

  const rank = getRank(player);
  const countryRank = getCountryRank(player);

  return (
    <SimpleLink href={`/player/${player.id}`}>
      {/* Desktop Layout */}
      <div
        className={cn(
          "bg-muted/50 hover:bg-accent/50 hidden items-center gap-2 rounded-md px-(--spacing-xs) py-(--spacing-xs) lg:flex",
          mainPlayer?.id == player.id ? "bg-primary/10 hover:bg-primary/15" : ""
        )}
      >
        {/* Rank, Weekly Change, and Country Rank */}
        <div
          className={cn(
            "grid grid-cols-[0.65fr_1fr] items-center gap-3",
            player.inactive && showAccountInactive ? "flex" : ""
          )}
          style={{
            width: `${firstColumnWidth}px`,
          }}
        >
          <PlayerRanks
            rank={rank}
            countryRank={countryRank}
            country={player.country}
            inactive={player.inactive && showAccountInactive}
          />
        </div>

        {/* Avatar and Name */}
        <div className="flex items-center gap-2">
          <PlayerAvatar profilePicture={getScoreSaberAvatar(player)} name={player.name} />
          <PlayerNameDisplay player={player} />
        </div>

        {/* Worth */}
        {renderWorth()}
      </div>

      {/* Mobile Layout */}
      <div className="block lg:hidden">
        <div
          className={cn(
            "bg-muted/50 mb-1 flex min-h-[67px] w-full cursor-pointer flex-col justify-center gap-1 rounded-lg px-2 py-1 shadow-sm transition-all",
            mainPlayer?.id == player.id ? "bg-primary/10" : ""
          )}
        >
          {/* Top row: Rank, Country Rank, and Weekly Change */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlayerRanks
                rank={rank}
                countryRank={countryRank}
                country={player.country}
                inactive={player.inactive && showAccountInactive}
              />
            </div>
          </div>

          {/* Bottom row: Avatar, Name, PP, and Action Button */}
          <div className="flex items-center gap-2">
            <PlayerAvatar
              profilePicture={getScoreSaberAvatar(player)}
              name={player.name}
              className="flex min-w-[28px] items-center"
            />
            <PlayerNameDisplay
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

function PlayerNameDisplay({
  player,
  className,
}: {
  player: ScoreSaberPlayerToken | ScoreSaberPlayer;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-1 justify-start", className)}>
      <span
        className="truncate text-sm font-medium text-white"
        style={{
          color: getScoreSaberRoles(player)[0]?.color,
        }}
      >
        {player.name}
      </span>
    </div>
  );
}

function PlayerRanks({
  rank,
  countryRank,
  country,
  inactive,
}: {
  rank: number;
  countryRank: number;
  country: string;
  inactive: boolean;
}) {
  if (inactive) {
    return <p className="text-inactive-account text-xs font-bold">Inactive Account</p>;
  }

  return (
    <>
      <RankDisplay rank={rank} />
      <CountryRankDisplay country={country} countryRank={countryRank} />
    </>
  );
}
