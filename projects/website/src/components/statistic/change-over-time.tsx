import SimpleTooltip from "@/components/simple-tooltip";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { StatisticRange } from "@ssr/common/player/player";
import { PlayerStatValue } from "@ssr/common/player/player-stat-change";
import { capitalizeFirstLetter } from "@ssr/common/string-utils";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { ReactElement } from "react";

type ChangeOverTimeProps = {
  player: ScoreSaberPlayer;

  type: PlayerStatValue;

  children: ReactElement;

  tooltipChildren?: ReactElement | null;
};

const formatChangeValue = (type: PlayerStatValue, value: number | undefined): string | number => {
  if (value == -0) {
    value = 0;
  }

  if (value === undefined) {
    return "No Data";
  }
  return type.type === "Performance Points" ? formatPp(value) + "pp" : formatNumberWithCommas(value);
};

const renderChange = (type: PlayerStatValue, value: number | undefined, range: StatisticRange) => (
  <p>
    {capitalizeFirstLetter(range)} Change:{" "}
    <span
      className={value === undefined ? "" : value >= 0 ? (value === 0 ? "" : "text-success") : "text-danger"}
    >
      <b>{formatChangeValue(type, value)}</b>
    </span>
  </p>
);

export function ChangeOverTime({ player, type, children, tooltipChildren }: ChangeOverTimeProps) {
  const daily = type.value(player, "daily");
  const weekly = type.value(player, "weekly");
  const monthly = type.value(player, "monthly");

  if (player.banned || player.inactive) {
    return children;
  }

  return (
    <SimpleTooltip
      side="bottom"
      display={
        <div>
          {renderChange(type, daily, "daily")}
          {renderChange(type, weekly, "weekly")}
          {renderChange(type, monthly, "monthly")}

          {tooltipChildren}
        </div>
      }
    >
      {children}
    </SimpleTooltip>
  );
}
