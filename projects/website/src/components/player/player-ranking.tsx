"use client";

import { getRankBgColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import { PlayerPpDisplay } from "@/components/ranking/player-pp-display";
import SimpleLink from "@/components/simple-link";
import useDatabase from "@/hooks/use-database";
import { useStableLiveQuery } from "@/hooks/use-stable-live-query";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import { PlayerAvatar } from "../ranking/player-avatar";
import CountryFlag from "../ui/country-flag";

/** Row types supported by {@link PlayerRanking}: display fields used by the layout. */
export type PlayerRankingRow = {
  id: string;
  name: string;
  country?: string | null;
  role?: string | null;
  avatar: string;
} & Partial<{ inactive: boolean }>;

export function ScoreSaberPlayerRanking<T extends ScoreSaberPlayer>({
  player,
  firstColumnWidth,
  getRank = p => p.rank,
  getCountryRank = p => p.countryRank,
  mainPlayer,
  relativePerformancePoints,
  showAccountInactive = true,
}: {
  player: T;
  firstColumnWidth: number;
  getRank?: (player: T) => number;
  getCountryRank?: (player: T) => number;
  mainPlayer?: ScoreSaberPlayer;
  relativePerformancePoints: boolean;
  showAccountInactive?: boolean;
}) {
  return (
    <PlayerRanking<T>
      player={player}
      getRank={getRank}
      getCountryRank={getCountryRank}
      firstColumnWidth={firstColumnWidth}
      showAccountInactive={showAccountInactive}
      worth={
        <PlayerPpDisplay
          pp={player.pp}
          mainPlayer={mainPlayer}
          className="ml-auto min-w-[70px]"
          relativePerformancePoints={relativePerformancePoints}
        />
      }
    />
  );
}

export function PlayerRanking<T extends PlayerRankingRow>({
  player,
  getRank,
  getCountryRank,
  firstColumnWidth,
  worth,
  showAccountInactive = true,
}: {
  player: T;
  getRank: (player: T) => number;
  getCountryRank: (player: T) => number;
  firstColumnWidth: number;
  worth: React.ReactNode;
  showAccountInactive?: boolean;
}) {
  const database = useDatabase();
  const mainPlayer = useStableLiveQuery(() => database.getMainPlayer());

  const rank = getRank(player);
  const countryRank = getCountryRank(player);
  const country = player.country ?? "";
  const inactive = Boolean(player.inactive);

  return (
    <SimpleLink href={`/player/${player.id}`}>
      {/* Desktop Layout */}
      <div
        className={cn(
          "bg-accent-deep hover:bg-accent-deep/50 hidden items-center gap-2 rounded-md px-(--spacing-xs) py-(--spacing-xs) lg:flex",
          mainPlayer?.id == player.id ? "bg-primary/10 hover:bg-primary/15" : ""
        )}
      >
        {/* Rank, Weekly Change, and Country Rank */}
        <div
          className={cn(
            "grid grid-cols-[0.55fr_0.9fr] items-center gap-3",
            inactive && showAccountInactive ? "flex" : ""
          )}
          style={{
            width: `${firstColumnWidth}px`,
          }}
        >
          <PlayerRanks
            rank={rank}
            countryRank={countryRank}
            country={country}
            inactive={inactive && showAccountInactive}
          />
        </div>

        {/* Avatar and Name */}
        <div className="flex items-center gap-2">
          <PlayerAvatar profilePicture={player.avatar} name={player.name} />
          <PlayerNameDisplay player={player} />
        </div>

        {/* Worth */}
        {worth}
      </div>

      {/* Mobile Layout */}
      <div className="block lg:hidden">
        <div
          className={cn(
            "bg-muted/50 mb-1 flex min-h-[67px] w-full cursor-pointer flex-col justify-center gap-1 rounded-lg px-2 py-1 transition-colors hover:shadow-xs",
            mainPlayer?.id == player.id ? "bg-primary/10" : ""
          )}
        >
          {/* Top row: Rank, Country Rank, and Weekly Change */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PlayerRanks
                rank={rank}
                countryRank={countryRank}
                country={country}
                inactive={inactive && showAccountInactive}
              />
            </div>
          </div>

          {/* Bottom row: Avatar, Name, PP, and Action Button */}
          <div className="flex items-center gap-2">
            <PlayerAvatar
              profilePicture={player.avatar}
              name={player.name}
              className="flex min-w-[28px] items-center"
            />
            <PlayerNameDisplay
              player={player}
              className="flex max-w-[140px] min-w-[90px] flex-1 items-center overflow-hidden"
            />
            {/* Worth */}
            {worth}
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
        "flex h-[24px] w-fit items-center justify-center gap-1 rounded-sm px-1 py-1 text-xs font-semibold",
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
          "flex h-[24px] items-center gap-1 rounded-sm px-1 py-1 text-xs font-semibold",
          getRankBgColor(countryRank)
        )}
      >
        <CountryFlag code={country} size={10} />
        <span>#{formatNumberWithCommas(countryRank)}</span>
      </div>
    </div>
  );
}

function PlayerNameDisplay<T extends PlayerRankingRow>({
  player,
  className,
}: {
  player: T;
  className?: string;
}) {
  const roles = getScoreSaberRoles(player);

  return (
    <div className={cn("flex min-w-0 flex-1 justify-start", className)}>
      <span
        className="truncate text-sm font-medium text-white"
        style={{
          color: roles[0]?.color,
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
