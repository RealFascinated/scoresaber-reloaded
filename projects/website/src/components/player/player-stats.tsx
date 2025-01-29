import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import StatValue from "@/components/stat-value";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatDate, timeAgo } from "@ssr/common/utils/time-utils";
import { ReactNode } from "react";
import Tooltip from "@/components/tooltip";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import PpBoundaryStat from "@/components/player/chart/pp-boundary";

type Stat = {
  name: string;
  color?: (player: ScoreSaberPlayer) => string;
  create: (player: ScoreSaberPlayer) => {
    tooltip?: string | ReactNode;
    value: string | ReactNode;
  };
};

const playerStats: Stat[] = [
  {
    name: "Ranked Play Count",
    color: () => "bg-pp",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: <>{formatNumberWithCommas(player.statistics.rankedPlayCount)}</>,
      };
    },
  },
  {
    name: "Total Ranked Score",
    color: () => "bg-pp",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: <>{formatNumberWithCommas(player.statistics.totalRankedScore)}</>,
      };
    },
  },
  {
    name: "Average Ranked Accuracy",
    color: () => "bg-pp",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: <>{player.statistics.averageRankedAccuracy.toFixed(2) + "%"}</>,
      };
    },
  },
  {
    name: "Total Play Count",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: <>{formatNumberWithCommas(player.statistics.totalPlayCount)}</>,
      };
    },
  },
  {
    name: "Total Score",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: <>{formatNumberWithCommas(player.statistics.totalScore)}</>,
      };
    },
  },
  {
    name: "Total Replays Watched",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: <>{formatNumberWithCommas(player.statistics.replaysWatched)}</>,
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
    name: "Headset",
    create: (player: ScoreSaberPlayer) => {
      return {
        tooltip: <p>The most common headset used in the last 50 scores</p>,
        value: player.hmd === undefined ? undefined : <>{player.hmd}</>,
      };
    },
  },
  {
    name: "Role",
    create: (player: ScoreSaberPlayer) => {
      const roles = getScoreSaberRoles(player);

      return {
        value: roles.length === 0 ? undefined : <p>{roles.map(role => role.name).join(", ")}</p>,
      };
    },
  },
  {
    name: "Peak Rank",
    create: (player: ScoreSaberPlayer) => {
      if (player.peakRank === undefined) {
        return {
          value: undefined,
        };
      }

      return {
        tooltip: (
          <p>
            {formatDate(player.peakRank.date, "DD MMMM YYYY")} ({timeAgo(player.peakRank.date)})
          </p>
        ),
        value: formatNumberWithCommas(player.peakRank.rank),
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
          return undefined;
        }
        const { tooltip, value } = toRender;
        const stat = <StatValue color={badge.color?.(player)} name={badge.name} value={value} />;

        return (
          <div key={index}>
            {tooltip ? (
              <Tooltip asChild={false} display={tooltip}>
                {stat}
              </Tooltip>
            ) : (
              stat
            )}
          </div>
        );
      })}

      <PpBoundaryStat player={player} />
    </div>
  );
}
