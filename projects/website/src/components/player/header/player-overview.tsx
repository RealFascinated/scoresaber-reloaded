import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import Link from "next/link";
import { ChangeOverTime } from "../../statistic/change-over-time";
import { DailyChange } from "../../statistic/daily-change";
import CountryFlag from "../../ui/country-flag";

function PlayerOverviewItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background/50 border-border/50 flex h-10 items-center gap-2 rounded-lg border px-3 py-2 text-gray-300">
      {children}
    </div>
  );
}

const playerData = [
  {
    showWhenInactiveOrBanned: false,
    render: (player: ScoreSaberPlayer) => {
      const statisticChange = player.statisticChange;
      const rankChange = statisticChange?.daily?.rank ?? 0;

      return (
        <PlayerOverviewItem>
          <GlobeAmericasIcon className="text-muted-foreground size-[20px]" />
          <ChangeOverTime player={player} type={PlayerStatChange.Rank}>
            <Link href={`/ranking/${player.rankPages.global}`}>
              <p className="hover:text-primary leading-none font-medium transition-all hover:brightness-[66%]">
                #{formatNumberWithCommas(player.rank)}
              </p>
            </Link>
          </ChangeOverTime>
          <DailyChange type={PlayerStatChange.Rank} change={rankChange} />
        </PlayerOverviewItem>
      );
    },
  },
  {
    showWhenInactiveOrBanned: false,
    render: (player: ScoreSaberPlayer) => {
      const statisticChange = player.statisticChange;
      const rankChange = statisticChange?.daily?.countryRank ?? 0;

      return (
        <PlayerOverviewItem>
          <CountryFlag code={player.country} size={16} className="rounded-sm" />
          <ChangeOverTime player={player} type={PlayerStatChange.CountryRank}>
            <Link href={`/ranking/${player.country}/${player.rankPages.country}`}>
              <p className="hover:text-primary leading-none font-medium transition-all hover:brightness-[66%]">
                #{formatNumberWithCommas(player.countryRank)}
              </p>
            </Link>
          </ChangeOverTime>
          <DailyChange type={PlayerStatChange.CountryRank} change={rankChange} />
        </PlayerOverviewItem>
      );
    },
  },
  {
    showWhenInactiveOrBanned: true,
    render: (player: ScoreSaberPlayer) => {
      const statisticChange = player.statisticChange;
      const ppChange = statisticChange?.daily?.pp ?? 0;

      return (
        <PlayerOverviewItem>
          <ChangeOverTime player={player} type={PlayerStatChange.PerformancePoints}>
            <p className="text-pp truncate leading-none font-semibold transition-all hover:brightness-110">
              {formatPp(player.pp)}pp
            </p>
          </ChangeOverTime>
          <DailyChange type={PlayerStatChange.PerformancePoints} change={ppChange} />
        </PlayerOverviewItem>
      );
    },
  },
];

type PlayerOverviewProps = {
  player: ScoreSaberPlayer;
};

export default function PlayerOverview({ player }: PlayerOverviewProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1 lg:items-start lg:justify-start">
      {playerData.map((subName, index) => {
        // Check if the player is inactive or banned and if the data should be shown
        if (!subName.showWhenInactiveOrBanned && (player.inactive || player.banned)) {
          return null;
        }

        return <div key={index}>{subName.render && subName.render(player)}</div>;
      })}
    </div>
  );
}
