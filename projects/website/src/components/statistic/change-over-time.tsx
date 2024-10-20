import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { capitalizeFirstLetter } from "@/common/string-utils";
import Tooltip from "@/components/tooltip";
import { PlayerStatValue } from "@ssr/common/player/player-stat";
import { ReactElement } from "react";

type ChangeOverTimeProps = {
  /**
   * The player to get the stats for
   */
  player: ScoreSaberPlayer;

  /**
   * The type of stat to get the change for
   */
  type: PlayerStatValue;

  /**
   * The children to render
   */
  children: ReactElement;
};

export function ChangeOverTime({ player, type, children }: ChangeOverTimeProps) {
  const todayStats = player.statisticChange?.daily;
  const weeklyStats = player.statisticChange?.weekly;
  const monthlyStats = player.statisticChange?.monthly;

  const todayStat = todayStats?.[type.value!];
  const weeklyStat = weeklyStats?.[type.value!];
  const monthlyStat = monthlyStats?.[type.value!];

  // Format values based on stat type
  const formatChangeValue = (value: number | undefined): string | number => {
    if (value === 0) {
      return 0;
    }
    if (value === undefined) {
      return "No Data";
    }
    return type.value === "pp" ? formatPp(value) + "pp" : formatNumberWithCommas(value);
  };

  // Renders the change for a given time frame
  const renderChange = (value: number | undefined, timeFrame: "daily" | "weekly" | "monthly") => (
    <p>
      {capitalizeFirstLetter(timeFrame)} Change:{" "}
      <span className={value === undefined ? "" : value >= 0 ? (value === 0 ? "" : "text-green-500") : "text-red-500"}>
        {formatChangeValue(value)}
      </span>
    </p>
  );

  // Return children if player is banned or inactive
  if (player.banned || player.inactive) {
    return children;
  }

  return (
    <Tooltip
      side="bottom"
      display={
        <div>
          {renderChange(todayStat, "daily")}
          {renderChange(weeklyStat, "weekly")}
          {renderChange(monthlyStat, "monthly")}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
