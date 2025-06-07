import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import Link from "next/link";
import CountryFlag from "../country-flag";
import { ChangeOverTime } from "../statistic/change-over-time";
import { DailyChange } from "../statistic/daily-change";

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
        <div className="text-gray-300 flex gap-1 items-center">
          <ChangeOverTime player={player} type={PlayerStatChange.Rank}>
            <Link prefetch={false} href={`/ranking/${player.rankPages.global}`}>
              <p className="hover:brightness-[66%] transition-all transform-gpu">
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
        <div className="text-gray-300 flex gap-1 items-center">
          <ChangeOverTime player={player} type={PlayerStatChange.CountryRank}>
            <Link prefetch={false} href={`/ranking/${player.country}/${player.rankPages.country}`}>
              <p className="hover:brightness-[66%] transition-all transform-gpu">
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
        <div className="text-gray-300 flex gap-1 items-center min-w-0">
          <ChangeOverTime player={player} type={PlayerStatChange.PerformancePoints}>
            <p className="hover:brightness-[66%] transition-all transform-gpu text-pp truncate">
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
    <div className="flex gap-2 flex-wrap justify-center items-center lg:justify-start lg:items-start">
      {playerData.map((subName, index) => {
        // Check if the player is inactive or banned and if the data should be shown
        if (!subName.showWhenInactiveOrBanned && (player.inactive || player.banned)) {
          return null;
        }

        return (
          <div key={index} className="flex gap-1 items-center">
            {subName.icon && subName.icon(player)}
            {subName.render && subName.render(player)}
          </div>
        );
      })}
    </div>
  );
}
