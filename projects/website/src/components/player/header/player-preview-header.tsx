import Avatar from "@/components/avatar";
import SimpleLink from "@/components/simple-link";
import SimpleTooltip from "@/components/simple-tooltip";
import { SharedIcons } from "@/shared-icons";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import CountryFlag from "../../ui/country-flag";

type PlayerPreviewHeaderProps = {
  /**
   * The player to display.
   */
  player: ScoreSaberPlayer;
};

export default function PlayerPreviewHeader({ player }: PlayerPreviewHeaderProps) {
  const isActive = !player.banned && !player.inactive;
  const currentStreak = Math.max(player.currentStreak, 0);

  return (
    <div className="flex flex-col items-center gap-6 text-center select-none lg:flex-row lg:text-start">
      {/* Avatar with subtle glow */}
      <div className="relative shrink-0">
        <div className="bg-primary/10 absolute inset-0 scale-110 rounded-full blur-3xl" />
        <Avatar
          src={player.avatar}
          size={128}
          className="relative h-32 w-32 ring-2 ring-white/15"
          alt={`${player.name}'s Profile Picture`}
        />
      </div>

      {/* Name + Stats */}
      <div className="flex flex-col items-center gap-2 lg:items-start">
        {/* Name */}
        <SimpleLink
          href={`/player/${player.id}`}
          className="hover:text-primary/80 text-3xl leading-tight font-bold tracking-tight transition-all"
          style={{
            color: getScoreSaberRoles(player)[0]?.color,
          }}
        >
          {player.name}
        </SimpleLink>

        {/* Key stats */}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm lg:justify-start">
          {isActive && (
            <>
              {/* Global rank */}
              <SimpleTooltip display={<span>Global Rank</span>} side="bottom">
                <span className="flex items-center gap-1.5 font-medium text-white/85">
                  <SharedIcons.GlobalRankIcon className="size-3.5 text-white/50" />#
                  {formatNumberWithCommas(player.rank)}
                </span>
              </SimpleTooltip>

              <span className="hidden text-white/15 sm:inline">|</span>

              {/* Country rank */}
              <SimpleTooltip display={<span>Country Rank</span>} side="bottom">
                <span className="flex items-center gap-1.5 font-medium text-white/85">
                  <CountryFlag code={player.country} size={9} className="rounded-xs" />#
                  {formatNumberWithCommas(player.countryRank)}
                </span>
              </SimpleTooltip>

              <span className="hidden text-white/15 sm:inline">|</span>
            </>
          )}

          {/* PP */}
          <SimpleTooltip display={<span>Performance Points</span>} side="bottom">
            <span className="text-pp flex items-center gap-1.5 font-semibold">
              <SharedIcons.PerformancePointsIcon className="size-3.5" />
              {formatPp(player.pp)}pp
            </span>
          </SimpleTooltip>

          <span className="hidden text-white/15 sm:inline">|</span>

          {/* Medals */}
          <SimpleTooltip display={<span>Medals</span>} side="bottom">
            <span className="flex items-center gap-1.5 font-medium text-white/85">
              <SharedIcons.MedalsIcon className="size-3.5 text-white/50" />
              {formatNumberWithCommas(player.medals)}
            </span>
          </SimpleTooltip>

          {/* Compact inline streak */}
          <span className="hidden text-white/15 sm:inline">|</span>
          <SimpleTooltip
            display={
              <div className="space-y-1">
                <p>Consecutive days with at least one tracked play.</p>
                <p>
                  Current: <b>{formatNumberWithCommas(currentStreak)}</b>
                </p>
                <p>
                  Best: <b>{formatNumberWithCommas(Math.max(player.longestStreak, 0))}</b>
                </p>
              </div>
            }
            side="bottom"
            showOnMobile
          >
            <span className="flex items-center gap-1.5 font-medium text-white/85">
              <SharedIcons.PlayerStreakIcon className="size-3.5 text-orange-400" />
              {formatNumberWithCommas(currentStreak)}
            </span>
          </SimpleTooltip>
        </div>
      </div>
    </div>
  );
}
