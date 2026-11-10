import { cn } from "@/common/utils";
import SimpleTooltip from "@/components/simple-tooltip";
import { ScoreSaberPlayerStatistics } from "@ssr/common/schemas/scoresaber/player/statistics";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getAccDetails, getScoreBadgeFromName } from "@ssr/common/utils/song-utils";

const badges: Partial<Record<keyof ScoreSaberPlayerStatistics, string>> = {
  aPlays: "A",
  sPlays: "S",
  spPlays: "S+",
  ssPlays: "SS",
  sspPlays: "SS+",
  godPlays: "GOD",
};

export default function PlayerAccBadges({ statistics }: { statistics: ScoreSaberPlayerStatistics }) {
  return (
    <div className="bg-background/60 ring-border divide-border/60 flex divide-x overflow-hidden rounded-lg ring-1">
      {Object.entries(badges).map(([name, displayName]) => {
        const badge = getScoreBadgeFromName(displayName.replace("Plus", "+"));
        const count = statistics[name as keyof ScoreSaberPlayerStatistics] ?? 0;

        return (
          <SimpleTooltip
            display={
              <div>
                <p>{getAccDetails(badge)}</p>
                <p className="italic">On Ranked Maps</p>
              </div>
            }
            key={name}
            showOnMobile
          >
            <div
              className={cn(
                "flex min-w-12 cursor-default flex-col items-center px-2.5 py-1 leading-tight",
                count === 0 && "opacity-45"
              )}
            >
              <span className="text-[11px] font-semibold tracking-wide" style={{ color: badge.color }}>
                {badge.name}
              </span>
              <span className="text-sm font-semibold tabular-nums">{formatNumberWithCommas(count)}</span>
            </div>
          </SimpleTooltip>
        );
      })}
    </div>
  );
}
