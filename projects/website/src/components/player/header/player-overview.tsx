import SimpleTooltip from "@/components/simple-tooltip";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { MEDAL_COUNTS } from "@ssr/common/medal";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import Link from "next/link";
import { FaMedal } from "react-icons/fa";
import { ChangeOverTime } from "../../statistic/change-over-time";
import { DailyChange } from "../../statistic/daily-change";
import CountryFlag from "../../ui/country-flag";

function PlayerOverviewItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-background border-border/80 flex h-8 items-center gap-2 rounded-lg border px-3 py-2 text-gray-300">
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
          <SimpleTooltip display={<p>Global Rank</p>}>
            <GlobeAmericasIcon className="text-muted-foreground size-[20px]" />
          </SimpleTooltip>
          <ChangeOverTime player={player} type={PlayerStatChange.Rank}>
            <Link href={`/ranking/${player.rankPages.global}`}>
              <p className="hover:text-primary text-sm transition-all hover:brightness-[66%]">
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
          <CountryFlag
            code={player.country}
            size={14}
            className="rounded-sm"
            tooltip={name => `Country Rank in ${name}`}
          />
          <ChangeOverTime player={player} type={PlayerStatChange.CountryRank}>
            <Link href={`/ranking/${player.country}/${player.rankPages.country}`}>
              <p className="hover:text-primary text-sm transition-all hover:brightness-[66%]">
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
      return (
        <PlayerOverviewItem>
          <SimpleTooltip
            display={
              <div className="flex flex-col gap-1">
                <span>Medals are awarded for the following ranks:</span>

                {Object.entries(MEDAL_COUNTS).map(([rank, count]) => (
                  <span key={rank} className="text-muted-foreground">
                    #{rank}{" "}
                    <span className="text-white">
                      = {count} Medal{count !== 1 ? "s" : ""}
                    </span>
                  </span>
                ))}
              </div>
            }
            className="flex flex-row items-center gap-1 text-center"
          >
            <FaMedal className="text-muted-foreground size-[16px]" />
            <p className="truncate text-sm transition-all hover:brightness-110">
              {formatNumberWithCommas(player.medals)} Medals
            </p>
          </SimpleTooltip>
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
            <p className="text-pp truncate text-sm font-semibold transition-all hover:brightness-110">
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
