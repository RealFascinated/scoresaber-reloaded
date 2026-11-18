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
        <div className="flex w-full items-center justify-between gap-3 rounded-lg bg-control px-3 py-2 ring-1 ring-border lg:hidden">
          <div className="flex items-center gap-2">
            <SharedIcons.PlayerStreakIcon className="size-4 shrink-0 text-streak" />
            <span className="text-sm font-semibold tabular-nums">
              {formatNumberWithCommas(currentStreak)} {pluralize(currentStreak, "day")}
            </span>
            <span className="text-xs text-muted-foreground">streak</span>
          </div>
          <span className="text-xs text-muted-foreground">
            Best {formatNumberWithCommas(longestStreak)} {pluralize(longestStreak, "day")}
          </span>
        </div>

        <div className="relative hidden w-32 rounded-lg bg-control px-3 py-2 ring-1 ring-border lg:block">
          <div className="relative flex items-center justify-between">
            <span className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
              Streak
            </span>
            <SharedIcons.PlayerStreakIcon className="size-3.5 text-streak" />
          </div>

          <div className="relative mt-0.5 flex items-end gap-1">
            <span className="text-base leading-none font-semibold tabular-nums">
              {formatNumberWithCommas(currentStreak)}
            </span>
            <span className="text-[11px] leading-none text-muted-foreground">
              {pluralize(currentStreak, "day")}
            </span>
          </div>

          <div className="relative mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-streak" style={{ width: `${progress}%` }} />
          </div>

          <div className="relative mt-1 text-[10px] text-muted-foreground">
            Best {formatNumberWithCommas(longestStreak)} {pluralize(longestStreak, "day")}
          </div>
        </div>
      </div>
    </SimpleTooltip>
  );
}
