import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import StatValue from "@/components/stat-value";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatDate } from "@ssr/common/utils/time-utils";
import { ReactNode } from "react";
import Tooltip from "@/components/tooltip";
import { DailyChange } from "@/components/statistic/daily-change";
import { getScoreSaberRole } from "@ssr/common/utils/scoresaber.util";
import { PlayerStatChange } from "@ssr/common/player/player-stat-change";

type Stat = {
  name: string;
  color?: string;
  create: (player: ScoreSaberPlayer) => {
    tooltip?: string | ReactNode;
    value: string | ReactNode;
  };
};

const playerStats: Stat[] = [
  {
    name: "Ranked Play Count",
    color: "bg-pp",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: (
          <>
            {formatNumberWithCommas(player.statistics.rankedPlayCount)}{" "}
            <DailyChange type={PlayerStatChange.RankedPlayCount} player={player} />
          </>
        ),
      };
    },
  },
  {
    name: "Total Ranked Score",
    color: "bg-pp",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: (
          <>
            {formatNumberWithCommas(player.statistics.totalRankedScore)}{" "}
            <DailyChange type={PlayerStatChange.TotalRankedScore} player={player} />
          </>
        ),
      };
    },
  },
  {
    name: "Average Ranked Accuracy",
    color: "bg-pp",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: (
          <>
            {player.statistics.averageRankedAccuracy.toFixed(2) + "%"}{" "}
            <DailyChange type={PlayerStatChange.AverageRankedAccuracy} player={player} />
          </>
        ),
      };
    },
  },
  {
    name: "Total Play Count",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: (
          <>
            {formatNumberWithCommas(player.statistics.totalPlayCount)}{" "}
            <DailyChange type={PlayerStatChange.TotalPlayCount} player={player} />
          </>
        ),
      };
    },
  },
  {
    name: "Total Score",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: (
          <>
            {formatNumberWithCommas(player.statistics.totalScore)}{" "}
            <DailyChange type={PlayerStatChange.TotalScore} player={player} />
          </>
        ),
      };
    },
  },
  {
    name: "Total Replays Watched",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: (
          <>
            {formatNumberWithCommas(player.statistics.replaysWatched)}{" "}
            <DailyChange type={PlayerStatChange.TotalReplaysWatched} player={player} />
          </>
        ),
      };
    },
  },
  {
    name: "Joined Date",
    create: (player: ScoreSaberPlayer) => {
      return {
        tooltip: formatDate(player.joinedDate, "DD MMMM YYYY HH:mm"),
        value: formatDate(player.joinedDate),
      };
    },
  },
  {
    name: "Role",
    create: (player: ScoreSaberPlayer) => {
      const role = getScoreSaberRole(player);

      return {
        value: role?.name,
      };
    },
  },
];

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerStats({ player }: Props) {
  return (
    <div className={`flex flex-wrap gap-2 w-full justify-center lg:justify-start`}>
      {playerStats.map((badge, index) => {
        const toRender = badge.create(player);
        if (toRender === undefined || toRender.value === undefined) {
          return <div key={index} />;
        }
        const { tooltip, value } = toRender;
        const stat = <StatValue key={index} color={badge.color} name={badge.name} value={value} />;

        return tooltip ? (
          <Tooltip asChild={false} display={tooltip} key={index}>
            {stat}
          </Tooltip>
        ) : (
          stat
        );
      })}
    </div>
  );
}
