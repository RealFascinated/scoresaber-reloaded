import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";
import Link from "next/link";
import Avatar from "../avatar";
import CountryFlag from "../country-flag";
import { DailyChange } from "../statistic/daily-change";

interface PlayerListItemProps {
  player: ScoreSaberPlayer;
}

export function PlayerListItem({ player }: PlayerListItemProps) {
  const statisticChange = player.statisticChange;
  const rankChange = statisticChange?.daily?.rank ?? 0;
  const countryRankChange = statisticChange?.daily?.countryRank ?? 0;

  return (
    <div className="flex flex-col md:grid md:grid-cols-[180px_1fr_auto] items-center gap-2 py-2 px-4 text-sm">
      {/* Top row (mobile) / Left column (desktop) */}
      <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-3">
        {/* Ranks Container */}
        <div className="flex items-center gap-3">
          {/* Global Rank */}
          <Link
            href={`/ranking/${player.rankPages.global}`}
            className="flex items-center gap-1 w-20"
          >
            <p className="font-medium text-xs md:text-sm tabular-nums">#{player.rank}</p>
            <DailyChange type={PlayerStatChange.Rank} change={rankChange} />
          </Link>

          {/* Country Rank */}
          <Link
            href={`/ranking/${player.country}/${player.rankPages.country}`}
            className="flex items-center gap-1 w-20"
          >
            <CountryFlag code={player.country} size={12} />
            <p className="font-medium text-xs md:text-sm tabular-nums">#{player.countryRank}</p>
            <DailyChange type={PlayerStatChange.CountryRank} change={countryRankChange} />
          </Link>
        </div>

        {/* Mobile PP */}
        <p className="text-pp text-right text-xs md:hidden">{player.pp.toLocaleString()}pp</p>
      </div>

      {/* Player's Avatar and Name */}
      <div className="w-full md:w-auto flex items-center gap-2">
        <Avatar src={player.avatar} alt={player.name} size={22} />
        <Link
          href={`/player/${player.id}`}
          className="hover:brightness-[66%] transition-all transform-gpu overflow-hidden"
        >
          <p className="truncate max-w-[160px] md:max-w-[250px]">{player.name}</p>
        </Link>
      </div>

      {/* Desktop PP */}
      <p className="hidden md:block text-pp text-right text-sm">{player.pp.toLocaleString()}pp</p>
    </div>
  );
}
