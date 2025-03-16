import SimpleTooltip from "@/components/simple-tooltip";
import { format } from "@formkit/tempo";
import { timeAgo } from "@ssr/common/utils/time-utils";

type ScoreTimeSetProps = {
  /**
   * The score that was set.
   */
  timestamp: Date;
};

export function ScoreTimeSet({ timestamp }: ScoreTimeSetProps) {
  return (
    <SimpleTooltip
      display={
        <p>
          {format({
            date: new Date(timestamp),
            format: "DD MMMM YYYY HH:mm a",
          })}
        </p>
      }
    >
      <p className="text-sm cursor-default select-none">{timeAgo(new Date(timestamp))}</p>
    </SimpleTooltip>
  );
}
