import { cn } from "@/common/utils";
import FallbackLink from "@/components/fallback-link";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
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
          <div className="flex items-center gap-1">
            <SimpleTooltip display={<span>Global Rank</span>}>
              <GlobeAmericasIcon className="text-muted-foreground h-5 w-5" />
            </SimpleTooltip>
            <ChangeOverTime
              player={player}
              type={PlayerStatChange.Rank}
              tooltipChildren={
                player.rankIncludingInactives ? (
                  <p>
                    Rank Including Inactives:{" "}
                    <b>#{formatNumberWithCommas(player.rankIncludingInactives)}</b>
                  </p>
                ) : null
              }
            >
              <SimpleLink
                href={`/ranking/${player.rankPages.global}`}
                data-umami-event="player-global-rank-button"
              >
                <span className="hover:text-primary m-0 text-sm leading-[1.2] transition-all hover:brightness-[66%]">
                  #{formatNumberWithCommas(player.rank)}
                </span>
              </SimpleLink>
            </ChangeOverTime>
            <DailyChange type={PlayerStatChange.Rank} change={rankChange} />
          </div>
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
          <div className="flex items-center justify-center gap-1">
            <CountryFlag
              code={player.country}
              size={10}
              className="rounded-sm"
              tooltip={name => `Country Rank in ${name}`}
            />
            <ChangeOverTime player={player} type={PlayerStatChange.CountryRank}>
              <SimpleLink
                href={`/ranking/${player.country}/${player.rankPages.country}`}
                data-umami-event="player-country-rank-button"
              >
                <span className="hover:text-primary m-0 text-sm leading-[1.4] transition-all hover:brightness-[66%]">
                  #{formatNumberWithCommas(player.countryRank)}
                </span>
              </SimpleLink>
            </ChangeOverTime>
            <DailyChange type={PlayerStatChange.CountryRank} change={rankChange} />
          </div>
        </PlayerOverviewItem>
      );
    },
  },
  {
    showWhenInactiveOrBanned: true,
    render: (player: ScoreSaberPlayer) => {
      return (
        <PlayerOverviewItem>
          <FaMedal className="text-muted-foreground size-4" />
          <FallbackLink
            href={player.rankPages.medals ? `/medals/${player.rankPages.medals}` : undefined}
            data-umami-event="player-medal-rank-button"
          >
            <span
              className={cn(
                "m-0 text-sm leading-[1.4]",
                player.rankPages.medals
                  ? "hover:text-primary cursor-pointer transition-all hover:brightness-[66%]"
                  : ""
              )}
            >
              {formatNumberWithCommas(player.medals)} Medals
            </span>
          </FallbackLink>
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
          <div className="flex items-center gap-1" style={{ height: "100%" }}>
            <ChangeOverTime player={player} type={PlayerStatChange.PerformancePoints}>
              <span
                className="text-pp m-0 truncate text-sm leading-[1.4] font-semibold transition-all hover:brightness-110"
                style={{ display: "inline-block", verticalAlign: "middle" }}
              >
                {formatPp(player.pp)}pp
              </span>
            </ChangeOverTime>
            <DailyChange type={PlayerStatChange.PerformancePoints} change={ppChange} />
          </div>
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
