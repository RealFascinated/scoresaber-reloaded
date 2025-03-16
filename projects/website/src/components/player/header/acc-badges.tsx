import StatValue from "@/components/stat-value";
import SimpleTooltip from "@/components/simple-tooltip";
import { AccBadges } from "@ssr/common/player/acc-badges";
import { getAccDetails, getScoreBadgeFromName } from "@ssr/common/utils/song-utils";

export default function PlayerAccBadges({ badges }: { badges: AccBadges }) {
  return (
    <div className="flex gap-2 items-center flex-wrap justify-center">
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
          >
            <StatValue name={badge.name} color={badge.color} value={count} className="h-full" />
          </SimpleTooltip>
        );
      })}
    </div>
  );
}
