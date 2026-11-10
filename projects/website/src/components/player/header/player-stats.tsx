"use client";

import { cn } from "@/common/utils";
import SimpleTooltip from "@/components/simple-tooltip";
import { SharedIcons } from "@/shared-icons";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import { formatDate, timeAgo } from "@ssr/common/utils/time-utils";
import { ReactNode, useState } from "react";

type StatContent = {
  value: ReactNode;

  tooltip?: ReactNode;

  /**
   * Optional classes for the value (e.g. a color).
   */
  valueClassName?: string;
};

type Stat = {
  name: string;
  defaultHidden?: boolean;
  create: (player: ScoreSaberPlayer) => StatContent | undefined;
};

const RANKED_VALUE_COLOR = "text-pp";

const playerStats: Stat[] = [
  {
    name: "Ranked Plays",
    create: player => ({
      value: formatNumberWithCommas(player.statistics.totalRankedScores),
      valueClassName: RANKED_VALUE_COLOR,
    }),
  },
  {
    name: "Ranked Score",
    create: player => ({
      value: formatNumberWithCommas(player.statistics.totalRankedScore),
      valueClassName: RANKED_VALUE_COLOR,
    }),
  },
  {
    name: "Avg Ranked Acc",
    create: player => ({
      value: `${player.statistics.averageRankedAccuracy.toFixed(2)}%`,
      valueClassName: RANKED_VALUE_COLOR,
    }),
  },
  {
    name: "Total Plays",
    create: player => ({ value: formatNumberWithCommas(player.statistics.totalScores) }),
  },
  {
    name: "Total Score",
    create: player => ({ value: formatNumberWithCommas(player.statistics.totalScore) }),
  },
  {
    name: "Joined",
    create: player => ({
      value: formatDate(player.joinedDate),
      tooltip: (
        <p>
          {formatDate(player.joinedDate, "DD MMMM YYYY HH:mm")} ({timeAgo(player.joinedDate)})
        </p>
      ),
    }),
  },
  {
    name: "Roles",
    create: player => {
      const roles = getScoreSaberRoles(player);
      if (roles.length === 0) {
        return undefined;
      }

      return {
        value: roles.map(role => role.shortName ?? role.name).join(", "),
        tooltip: (
          <div className="flex flex-col gap-0.5">
            {roles.map(role => (
              <div key={role.roleId} className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: role.color }} />
                <span>{role.name}</span>
              </div>
            ))}
          </div>
        ),
      };
    },
  },
  {
    name: "Tracked Since",
    defaultHidden: true,
    create: player => ({
      value: formatDate(player.trackedSince),
      tooltip: (
        <p>
          {formatDate(player.trackedSince, "DD MMMM YYYY HH:mm")} ({timeAgo(player.trackedSince)})
        </p>
      ),
    }),
  },
  {
    name: "Headset",
    defaultHidden: true,
    create: player => {
      if (player.hmd === undefined) {
        return undefined;
      }

      return {
        value: (
          <span className="flex items-center gap-1.5">
            <SharedIcons.HeadMountedDisplayIcon hmd={getHMDInfo(player.hmd as HMD)} />
            {player.hmd}
          </span>
        ),
        tooltip: (
          <div className="flex flex-col gap-1">
            <p className="mb-1">Percentage breakdown of headsets for all scores</p>
            {Object.entries(player.hmdBreakdown ?? {}).map(([hmdKey, percentage]) => (
              <div key={hmdKey} className="flex items-center gap-2">
                <SharedIcons.HeadMountedDisplayIcon hmd={getHMDInfo(hmdKey as HMD)} />
                <span>{hmdKey}</span>
                <span className="text-muted-foreground text-sm">{percentage.toFixed(2)}%</span>
              </div>
            ))}
          </div>
        ),
      };
    },
  },
  {
    name: "Peak Rank",
    defaultHidden: true,
    create: player => {
      if (player.peakRank === undefined) {
        return undefined;
      }

      return {
        value: `#${formatNumberWithCommas(player.peakRank.rank)}`,
        tooltip: (
          <p>
            {formatDate(player.peakRank.timestamp, "DD MMMM YYYY")} ({timeAgo(player.peakRank.timestamp)})
          </p>
        ),
      };
    },
  },
  {
    name: "+1 PP",
    defaultHidden: true,
    create: player => {
      if (!player.plusOnePp) {
        return undefined;
      }

      return {
        value: `${formatPp(player.plusOnePp)}pp`,
        tooltip: <p>Amount of raw PP required to increase your global pp by 1pp</p>,
      };
    },
  },
];

function PlayerStat({ name, content }: { name: string; content: StatContent }) {
  return (
    <div className="bg-control ring-border flex min-w-0 flex-col gap-0.5 rounded-lg px-2.5 py-1.5 ring-1 lg:gap-1 lg:px-3 lg:py-2">
      <dt className="text-muted-foreground truncate text-[11px] font-medium tracking-wide uppercase">
        {name}
      </dt>
      <dd className={cn("m-0 truncate text-sm font-semibold tabular-nums", content.valueClassName)}>
        {content.tooltip ? (
          <SimpleTooltip display={content.tooltip} side="bottom" showOnMobile className="w-fit max-w-full">
            {content.value}
          </SimpleTooltip>
        ) : (
          content.value
        )}
      </dd>
    </div>
  );
}

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerStats({ player }: Props) {
  const [showMore, setShowMore] = useState(false);

  const allStats = playerStats.map(stat => ({ stat, content: stat.create(player) }));
  const visibleStats = allStats.filter(
    ({ stat, content }) => content !== undefined && (!stat.defaultHidden || showMore)
  );
  const hiddenStatCount = allStats.filter(
    ({ stat, content }) => content !== undefined && stat.defaultHidden
  ).length;

  return (
    <div className="flex w-full flex-col items-center gap-2 lg:items-start">
      <dl
        id="player-stats"
        className="m-0 grid w-full grid-cols-2 gap-1.5 text-left sm:grid-cols-3 lg:gap-2 2xl:grid-cols-4"
      >
        {visibleStats.map(({ stat, content }) =>
          content ? <PlayerStat key={`player-stat-${stat.name}`} name={stat.name} content={content} /> : null
        )}
      </dl>

      {hiddenStatCount > 0 && (
        <button
          type="button"
          aria-expanded={showMore}
          aria-controls="player-stats"
          onClick={() => setShowMore(current => !current)}
          className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 text-xs font-medium transition-colors"
        >
          {showMore ? "Show less" : `Show ${hiddenStatCount} more`}
          {showMore ? (
            <SharedIcons.CollapsePlayerStatsIcon className="size-3.5 shrink-0" />
          ) : (
            <SharedIcons.ExpandPlayerStatsIcon className="size-3.5 shrink-0" />
          )}
        </button>
      )}
    </div>
  );
}
