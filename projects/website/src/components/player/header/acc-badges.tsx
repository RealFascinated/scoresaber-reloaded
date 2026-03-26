import SimpleTooltip from "@/components/simple-tooltip";
import StatValue from "@/components/statistic/stat-value";
import { PlayerScoreStats } from "@ssr/common/model/player/player-score-stats";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getAccDetails, getScoreBadgeFromName } from "@ssr/common/utils/song-utils";

const badges: Record<keyof PlayerScoreStats, { name: string; color: string }> = {
  aPlays: { name: "A", color: "bg-statistic" },
  sPlays: { name: "S", color: "bg-statistic" },
  spPlays: { name: "S+", color: "bg-statistic" },
  ssPlays: { name: "SS", color: "bg-statistic" },
  sspPlays: { name: "SS+", color: "bg-statistic" },
  godPlays: { name: "GOD", color: "bg-statistic" },
};

export default function PlayerAccBadges({ scoreStats }: { scoreStats: PlayerScoreStats }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {Object.entries(badges).map(([name, count]) => {
        const badge = getScoreBadgeFromName(name.replace("Plus", "+"));

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
            <StatValue
              name={badge.name}
              color={badge.color}
              value={formatNumberWithCommas(scoreStats[name as keyof PlayerScoreStats] ?? 0)}
              className="h-full"
              size="lg"
            />
          </SimpleTooltip>
        );
      })}
    </div>
  );
}
