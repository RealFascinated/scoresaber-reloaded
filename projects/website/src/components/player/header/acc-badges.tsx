import SimpleTooltip from "@/components/simple-tooltip";
import StatValue from "@/components/statistic/stat-value";
import type { ScoreSaberPlayerScoreStats } from "@ssr/common/schemas/scoresaber/player/score-stats";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getAccDetails, getScoreBadgeFromName } from "@ssr/common/utils/song-utils";

const badges: Record<keyof ScoreSaberPlayerScoreStats, string> = {
  aPlays: "A",
  sPlays: "S",
  spPlays: "S+",
  ssPlays: "SS",
  sspPlays: "SS+",
  godPlays: "GOD",
};

export default function PlayerAccBadges({ scoreStats }: { scoreStats: ScoreSaberPlayerScoreStats }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {Object.entries(badges).map(([name, displayName]) => {
        const badge = getScoreBadgeFromName(displayName.replace("Plus", "+"));

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
              value={formatNumberWithCommas(scoreStats[name as keyof ScoreSaberPlayerScoreStats] ?? 0)}
              className="h-full"
              size="lg"
            />
          </SimpleTooltip>
        );
      })}
    </div>
  );
}
