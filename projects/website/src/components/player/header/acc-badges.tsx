import SimpleTooltip from "@/components/simple-tooltip";
import StatValue from "@/components/stat-value";
import { AccBadges } from "@ssr/common/player/acc-badges";
import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import { getAccDetails, getScoreBadgeFromName } from "@ssr/common/utils/song-utils";

export default function PlayerAccBadges({ badges }: { badges: AccBadges }) {
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
              value={formatNumberWithCommas(count)}
              className="h-full"
            />
          </SimpleTooltip>
        );
      })}
    </div>
  );
}
