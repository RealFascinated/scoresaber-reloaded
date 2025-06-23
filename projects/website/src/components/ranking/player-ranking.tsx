"use client";

import { getRankBgColor } from "@/common/rank-color-utils";
import { cn } from "@/common/utils";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { ScoreSaberPlayerToken } from "@ssr/common/types/token/scoresaber/player";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getScoreSaberAvatar } from "@ssr/common/utils/scoresaber.util";
import { ArrowDownRightIcon, ArrowUpRightIcon } from "lucide-react";
import Link from "next/link";
import PlayerPreview from "../player/player-preview";
import CountryFlag from "../ui/country-flag";
import { PlayerAvatar } from "./player-avatar";
import { PlayerName } from "./player-name";
import { PlayerPpDisplay } from "./player-pp-display";

export function PlayerRanking({
  player,
  mainPlayer,
  relativePerformancePoints,
  firstColumnWidth,
}: {
  player: ScoreSaberPlayerToken | ScoreSaberPlayer;
  mainPlayer?: ScoreSaberPlayer;
  relativePerformancePoints: boolean;
  firstColumnWidth: number;
}) {
  let weeklyRankChange: number;
  if ("histories" in player) {
    const history = player.histories.split(",").map(Number);
    weeklyRankChange = history[history?.length - 6] - player.rank;
  } else {
    weeklyRankChange = player.statisticChange?.weekly.rank ?? 0;
  }

  return (
    <Link href={`/player/${player.id}`}>
      {/* Desktop Layout */}
      <div className="hidden xl:block">
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
            className={cn("grid grid-cols-[0.85fr_0.85fr_1fr] items-center gap-3")}
            style={{
              width: `${firstColumnWidth}px`,
            }}
          >
            <RankDisplay rank={player.rank} />
            <WeeklyRankChange weeklyRankChange={weeklyRankChange} />
            <CountryRankDisplay country={player.country} countryRank={player.countryRank} />
          </div>

          {/* Avatar and Name */}
          <div className="flex items-center gap-2">
            <PlayerAvatar profilePicture={getScoreSaberAvatar(player)} name={player.name} />
            <PlayerName name={player.name} />
          </div>

          {/* PP */}
          <PlayerPpDisplay
            pp={player.pp}
            mainPlayer={mainPlayer}
            relativePerformancePoints={relativePerformancePoints}
            className="justify-end"
          />
        </PlayerPreview>
      </div>

      {/* Mobile Layout */}
      <div className="xl:hidden">
        <div className="mb-1 flex min-h-[67px] w-full cursor-pointer flex-col justify-center gap-1 rounded-lg bg-[#232323] px-2 py-1 shadow-sm transition-all hover:bg-[#2d2d2d]">
          {/* Top row: Rank, Country Rank, and Weekly Change */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RankDisplay rank={player.rank} />
              <CountryRankDisplay country={player.country} countryRank={player.countryRank} />
            </div>
            <WeeklyRankChange weeklyRankChange={weeklyRankChange} />
          </div>

          {/* Bottom row: Avatar, Name, PP, and Action Button */}
          <div className="flex items-center gap-2">
            <PlayerAvatar
              profilePicture={getScoreSaberAvatar(player)}
              name={player.name}
              className="flex min-w-[28px] items-center"
            />
            <PlayerName
              name={player.name}
              className="flex max-w-[140px] min-w-[90px] flex-1 items-center overflow-hidden"
            />
            <PlayerPpDisplay
              pp={player.pp}
              mainPlayer={mainPlayer}
              relativePerformancePoints={relativePerformancePoints}
              className="ml-auto min-w-[70px]"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function RankDisplay({ rank }: { rank: number }) {
  return (
    <div
      className={cn(
        "flex min-h-[22px] w-fit items-center justify-center gap-1 rounded px-1 py-1",
        getRankBgColor(rank)
      )}
    >
      <span>#{formatNumberWithCommas(rank)}</span>
    </div>
  );
}

function WeeklyRankChange({ weeklyRankChange }: { weeklyRankChange: number }) {
  if (Math.abs(weeklyRankChange) > 999) {
    return <div />;
  }
  return (
    <div className="flex">
      {weeklyRankChange > 0 && <ArrowUpRightIcon className="h-4 w-4 text-green-500" />}
      {weeklyRankChange < 0 && <ArrowDownRightIcon className="h-4 w-4 text-red-500" />}
      {weeklyRankChange !== 0 && (
        <span
          className={cn(
            "ml-1 text-xs font-semibold",
            weeklyRankChange > 0 ? "text-green-500" : "text-red-500"
          )}
        >
          {formatNumberWithCommas(Math.abs(weeklyRankChange))}
        </span>
      )}
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
