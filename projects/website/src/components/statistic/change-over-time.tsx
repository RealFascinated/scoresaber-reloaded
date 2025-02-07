import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import Tooltip from "@/components/tooltip";
import { ReactElement } from "react";
import { PlayerStatValue } from "@ssr/common/player/player-stat-change";
import { StatisticRange } from "@ssr/common/player/player";

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
  children: ReactElement<any>;
};

export function ChangeOverTime({ player, type, children }: ChangeOverTimeProps) {
  const daily = type.value(player, "daily");
  const weekly = type.value(player, "weekly");
  const monthly = type.value(player, "monthly");

  // Format values based on stat type
  const formatChangeValue = (value: number | undefined): string | number => {
    if (value === 0) {
      return 0;
    }
    if (value === undefined) {
      return "No Data";
    }
    return type.type === "Performance Points"
      ? formatPp(value) + "pp"
      : formatNumberWithCommas(value);
  };

  // Renders the change for a given time frame
  const renderChange = (value: number | undefined, range: StatisticRange) => (
    <p>
      {capitalizeFirstLetter(range)} Change:{" "}
      <span
        className={
          value === undefined
            ? ""
            : value >= 0
              ? value === 0
                ? ""
                : "text-green-500"
              : "text-red-500"
        }
      >
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
          {renderChange(daily, "daily")}
          {renderChange(weekly, "weekly")}
          {renderChange(monthly, "monthly")}
        </div>
      }
    >
      {children}
    </Tooltip>
  );
}
