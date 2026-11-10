import SimpleTooltip from "@/components/simple-tooltip";
import { SharedIcons } from "@/shared-icons";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { pluralize } from "@ssr/common/utils/string.util";

type PlayerStreakProps = {
  player: ScoreSaberPlayer;
};

export default function PlayerStreak({ player }: PlayerStreakProps) {
  const currentStreak = Math.max(player.currentStreak, 0);
  const longestStreak = Math.max(player.longestStreak, 0);
  const progress = longestStreak > 0 ? Math.min((currentStreak / longestStreak) * 100, 100) : 0;

  return (
    <SimpleTooltip
      display={
        <div className="space-y-1">
          <p>Consecutive days with at least one tracked play.</p>
          <p>
            Current:{" "}
            <b>
              {formatNumberWithCommas(currentStreak)} {pluralize(currentStreak, "day")}
            </b>
          </p>
          <p>
            Best:{" "}
            <b>
              {formatNumberWithCommas(longestStreak)} {pluralize(longestStreak, "day")}
            </b>
          </p>
        </div>
      }
      side="bottom"
      showOnMobile
    >
      <div className="w-full lg:w-fit">
        <div className="bg-control ring-border flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 ring-1 lg:hidden">
          <div className="flex items-center gap-2">
            <SharedIcons.PlayerStreakIcon className="text-streak size-4 shrink-0" />
            <span className="text-sm font-semibold tabular-nums">
              {formatNumberWithCommas(currentStreak)} {pluralize(currentStreak, "day")}
            </span>
            <span className="text-muted-foreground text-xs">streak</span>
          </div>
          <span className="text-muted-foreground text-xs">
            Best {formatNumberWithCommas(longestStreak)} {pluralize(longestStreak, "day")}
          </span>
        </div>

        <div className="bg-control ring-border relative hidden w-32 rounded-lg px-3 py-2 ring-1 lg:block">
          <div className="relative flex items-center justify-between">
            <span className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
              Streak
            </span>
            <SharedIcons.PlayerStreakIcon className="text-streak size-3.5" />
          </div>

          <div className="relative mt-0.5 flex items-end gap-1">
            <span className="text-base leading-none font-semibold tabular-nums">
              {formatNumberWithCommas(currentStreak)}
            </span>
            <span className="text-muted-foreground text-[11px] leading-none">
              {pluralize(currentStreak, "day")}
            </span>
          </div>

          <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
            <div className="bg-streak h-full rounded-full" style={{ width: `${progress}%` }} />
          </div>

          <div className="text-muted-foreground relative mt-1 text-[10px]">
            Best {formatNumberWithCommas(longestStreak)} {pluralize(longestStreak, "day")}
          </div>
        </div>
      </div>
    </SimpleTooltip>
  );
}
