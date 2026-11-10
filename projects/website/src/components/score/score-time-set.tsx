import SimpleTooltip from "@/components/simple-tooltip";
import { useTimeAgo } from "@/hooks/use-time-ago";
import { format } from "@formkit/tempo";

type ScoreTimeSetProps = {
  /**
   * The score that was set.
   */
  timestamp: Date;
};

/**
 * Its own component so the date is only formatted when the tooltip opens, not for every row on render.
 */
export function ScoreTimeSetTooltip({ timestamp }: ScoreTimeSetProps) {
  return (
    <p>
      {format({
        date: new Date(timestamp),
        format: "DD MMMM YYYY HH:mm a",
      })}
    </p>
  );
}

export function ScoreTimeSet({ timestamp }: ScoreTimeSetProps) {
  const timeAgoText = useTimeAgo(timestamp);

  return (
    <SimpleTooltip display={<ScoreTimeSetTooltip timestamp={timestamp} />} showOnMobile>
      <p className="cursor-default text-sm select-none">{timeAgoText}</p>
    </SimpleTooltip>
  );
}
