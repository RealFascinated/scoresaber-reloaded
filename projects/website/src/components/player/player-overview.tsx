import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import Link from "next/link";
import { ChangeOverTime } from "../statistic/change-over-time";
import { DailyChange } from "../statistic/daily-change";
import CountryFlag from "../ui/country-flag";

const playerData = [
  {
    showWhenInactiveOrBanned: false,
    icon: () => {
      return <GlobeAmericasIcon className="h-5 w-5" />;
    },
    render: (player: ScoreSaberPlayer) => {
      const statisticChange = player.statisticChange;
      const rankChange = statisticChange?.daily?.rank ?? 0;

      return (
        <div className="flex items-center gap-1 text-gray-300">
          <ChangeOverTime player={player} type={PlayerStatChange.Rank}>
            <Link href={`/ranking/${player.rankPages.global}`}>
              <p className="transition-all hover:brightness-[66%]">
                #{formatNumberWithCommas(player.rank)}
              </p>
            </Link>
          </ChangeOverTime>
          <DailyChange type={PlayerStatChange.Rank} change={rankChange} />
        </div>
      );
    },
  },
  {
    showWhenInactiveOrBanned: false,
    icon: (player: ScoreSaberPlayer) => {
      return <CountryFlag code={player.country} size={15} />;
    },
    render: (player: ScoreSaberPlayer) => {
      const statisticChange = player.statisticChange;
      const rankChange = statisticChange?.daily?.countryRank ?? 0;

      return (
        <div className="flex items-center gap-1 text-gray-300">
          <ChangeOverTime player={player} type={PlayerStatChange.CountryRank}>
            <Link href={`/ranking/${player.country}/${player.rankPages.country}`}>
              <p className="transition-all hover:brightness-[66%]">
                #{formatNumberWithCommas(player.countryRank)}
              </p>
            </Link>
          </ChangeOverTime>
          <DailyChange type={PlayerStatChange.CountryRank} change={rankChange} />
        </div>
      );
    },
  },
  {
    showWhenInactiveOrBanned: true,
    render: (player: ScoreSaberPlayer) => {
      const statisticChange = player.statisticChange;
      const ppChange = statisticChange?.daily?.pp ?? 0;

      return (
        <div className="flex min-w-0 items-center gap-1 text-gray-300">
          <ChangeOverTime player={player} type={PlayerStatChange.PerformancePoints}>
            <p className="text-pp truncate transition-all hover:brightness-[66%]">
              {formatPp(player.pp)}pp
            </p>
          </ChangeOverTime>
          <DailyChange type={PlayerStatChange.PerformancePoints} change={ppChange} />
        </div>
      );
    },
  },
];

type PlayerOverviewProps = {
  player: ScoreSaberPlayer;
};

export default function PlayerOverview({ player }: PlayerOverviewProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 lg:items-start lg:justify-start">
      {playerData.map((subName, index) => {
        // Check if the player is inactive or banned and if the data should be shown
        if (!subName.showWhenInactiveOrBanned && (player.inactive || player.banned)) {
          return null;
        }

        return (
          <div key={index} className="flex items-center gap-1">
            {subName.icon && subName.icon(player)}
            {subName.render && subName.render(player)}
          </div>
        );
      })}
    </div>
  );
}
