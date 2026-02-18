import SimpleTooltip from "@/components/simple-tooltip";
import { format } from "@formkit/tempo";
import { timeAgo } from "@ssr/common/utils/time-utils";
import { useEffect, useState } from "react";

type ScoreTimeSetProps = {
  /**
   * The score that was set.
   */
  timestamp: Date;
};

export function ScoreTimeSet({ timestamp }: ScoreTimeSetProps) {
  const [currentTime, setCurrentTime] = useState(() => timeAgo(new Date(timestamp)));

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(timeAgo(new Date(timestamp)));
    }, 1000);
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
      <p className="cursor-default text-sm select-none">{currentTime}</p>
    </SimpleTooltip>
  );
}
