import SimpleTooltip from "@/components/simple-tooltip";
import StatValue from "@/components/statistic/stat-value";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import { formatDate, timeAgo } from "@ssr/common/utils/time-utils";
import { ReactNode } from "react";
import HMDIcon from "../../hmd-icon";

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
    color: () => "bg-statistic",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: <>{formatNumberWithCommas(player.statistics.rankedPlayCount)}</>,
      };
    },
  },
  {
    name: "Total Ranked Score",
    color: () => "bg-statistic",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: <>{formatNumberWithCommas(player.statistics.totalRankedScore)}</>,
      };
    },
  },
  {
    name: "Average Ranked Accuracy",
    color: () => "bg-statistic",
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
        tooltip: (
          <p>
            {formatDate(player.joinedDate, "DD MMMM YYYY HH:mm")} ({timeAgo(player.joinedDate)})
          </p>
        ),
        value: formatDate(player.joinedDate),
      };
    },
  },
  {
    name: "Tracked Since",
    create: (player: ScoreSaberPlayer) => {
      return {
        tooltip: (
          <p>
            {formatDate(player.trackedSince, "DD MMMM YYYY HH:mm")} ({timeAgo(player.trackedSince)})
          </p>
        ),
        value: formatDate(player.trackedSince),
      };
    },
  },
  {
    name: "Headset",
    create: (player: ScoreSaberPlayer) => {
      const hmd = getHMDInfo(player.hmd as HMD);

      return {
        tooltip: <p>The most common headset used in the last 50 scores</p>,
        value:
          player.hmd === undefined ? undefined : (
            <div className="flex items-center gap-1.5">
              <HMDIcon hmd={hmd} />
              <span>{player.hmd}</span>
            </div>
          ),
      };
    },
  },
  {
    name: "Roles",
    create: (player: ScoreSaberPlayer) => {
      const roles = getScoreSaberRoles(player);

      return {
        value:
          roles.length === 0 ? undefined : (
            <SimpleTooltip
              display={
                <div className="flex flex-col gap-0.5">
                  {roles.map(role => (
                    <div key={role.roleId} className="flex items-center gap-2">
                      <div
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: role.color }}
                      />
                      <span>{role.name}</span>
                    </div>
                  ))}
                </div>
              }
              side="bottom"
            >
              <p>{roles.map(role => role.shortName ?? role.name).join(", ")}</p>
            </SimpleTooltip>
          ),
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
  {
    name: "+1 PP",
    create: (player: ScoreSaberPlayer) => {
      return {
        tooltip: <p>Amount of raw PP required to increase your global pp by 1pp</p>,
        value: <>{formatPp(player.plusOnePP)}pp</>,
      };
    },
  },
];

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerStats({ player }: Props) {
  return (
    <div className={`flex w-full flex-wrap justify-center gap-2 lg:justify-start`}>
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
              <SimpleTooltip display={tooltip} showOnMobile>
                {stat}
              </SimpleTooltip>
            ) : (
              stat
            )}
          </div>
        );
      })}
    </div>
  );
}
