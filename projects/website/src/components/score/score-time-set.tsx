import SimpleTooltip from "@/components/simple-tooltip";
import { format } from "@formkit/tempo";
import { timeAgo, TimeUnit } from "@ssr/common/utils/time-utils";
import { useEffect, useState } from "react";

type ScoreTimeSetProps = {
  /**
   * The score that was set.
   */
  timestamp: Date;
};

export function ScoreTimeSet({ timestamp }: ScoreTimeSetProps) {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    const updateInterval = () => {
      const msAgo = Date.now() - new Date(timestamp).getTime();

      let interval: number;
      if (msAgo < TimeUnit.toMillis(TimeUnit.Hour, 1)) {
        interval = TimeUnit.toMillis(TimeUnit.Second, 1);
      } else {
        interval = TimeUnit.toMillis(TimeUnit.Minute, 1);
      }

      return interval;
    };

    const interval = setInterval(() => {
      forceUpdate({});
    }, updateInterval());

    return () => clearInterval(interval);
  }, [timestamp]);

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
      showOnMobile
    >
      <p className="cursor-default text-sm select-none">{timeAgo(new Date(timestamp))}</p>
    </SimpleTooltip>
  );
}
