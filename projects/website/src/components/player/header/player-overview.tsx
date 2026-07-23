import { cn } from "@/common/utils";
import FallbackLink from "@/components/fallback-link";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { SharedIcons } from "@/shared-icons";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ChangeOverTime } from "../../statistic/change-over-time";
import { DailyChange } from "../../statistic/daily-change";
import CountryFlag from "../../ui/country-flag";

function PlayerOverviewItem({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-primary/20 bg-primary/10 flex h-10 items-center gap-2 rounded-full border px-4 py-1.5">
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
          <div className="flex items-center gap-2">
            <SimpleTooltip display={<span>Global Rank</span>} side="bottom">
              <SharedIcons.GlobalRankIcon className="text-muted-foreground h-5 w-5 shrink-0" />
            </SimpleTooltip>
            <ChangeOverTime
              player={player}
              type={PlayerStatChange.Rank}
              tooltipChildren={
                <div className="mt-3">
                  {player.rankPercentile && (
                    <p>
                      Rank Percentile: <b>{player.rankPercentile.toFixed(2)}%</b>
                    </p>
                  )}
                </div>
              }
            >
              <SimpleLink href={`/ranking/${player.rankPages.global}`}>
                <span className="text-foreground hover:text-primary focus-visible:outline-primary/50 m-0 text-base font-semibold transition-colors focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
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
          <div className="flex items-center justify-center gap-2">
            <CountryFlag
              code={player.country}
              size={10}
              className="rounded-xs"
              tooltipSide="bottom"
              tooltip={name => `Country Rank in ${name}`}
            />
            <ChangeOverTime player={player} type={PlayerStatChange.CountryRank}>
              <SimpleLink href={`/ranking/${player.country}/${player.rankPages.country}`}>
                <span className="text-foreground hover:text-primary focus-visible:outline-primary/50 m-0 text-base font-semibold transition-colors focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2">
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
      const statisticChange = player.statisticChange;
      const medalsChange = statisticChange?.daily?.medals ?? 0;

      return (
        <PlayerOverviewItem>
          <div className="flex items-center gap-2">
            <SimpleTooltip display={<span>Medals</span>} side="bottom">
              <SharedIcons.MedalsIcon className="text-muted-foreground h-5 w-5 shrink-0" />
            </SimpleTooltip>
            <ChangeOverTime player={player} type={PlayerStatChange.Medals}>
              <FallbackLink href={player.rankPages.medals ? `/medals/${player.rankPages.medals}` : undefined}>
                <span
                  className={cn(
                    "text-foreground m-0 text-base font-semibold",
                    player.rankPages.medals ? "hover:text-primary cursor-pointer transition-colors" : ""
                  )}
                >
                  {formatNumberWithCommas(player.medals)}
                </span>
              </FallbackLink>
            </ChangeOverTime>
            <DailyChange type={PlayerStatChange.Medals} change={medalsChange} />
          </div>
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
          <div className="flex items-center gap-2">
            <SimpleTooltip display={<span>Performance Points</span>} side="bottom">
              <SharedIcons.PerformancePointsIcon className="text-muted-foreground h-5 w-5 shrink-0" />
            </SimpleTooltip>
            <ChangeOverTime player={player} type={PlayerStatChange.PerformancePoints}>
              <span className="text-pp hover:text-primary m-0 truncate text-base font-semibold transition-colors">
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
    <div className="flex flex-wrap items-center justify-center gap-2 lg:items-start lg:justify-start">
      {playerData.map((subName, index) => {
        // Check if the player is inactive or banned and if the data should be shown
        if (!subName.showWhenInactiveOrBanned && (player.inactive || player.banned)) {
          return null;
        }

        return (
          <div key={`player-overview-${index}-${subName.showWhenInactiveOrBanned}`}>
            {subName.render?.(player)}
          </div>
        );
      })}
    </div>
  );
}
