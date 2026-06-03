"use client";

import SimpleTooltip from "@/components/simple-tooltip";
import StatValue from "@/components/statistic/stat-value";
import { getHMDInfo, HMD } from "@ssr/common/hmds";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatNumberWithCommas, formatPp } from "@ssr/common/utils/number-utils";
import { getScoreSaberRoles } from "@ssr/common/utils/scoresaber.util";
import { formatDate, timeAgo } from "@ssr/common/utils/time-utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { ReactNode, useState } from "react";
import HMDIcon from "../../hmd-icon";

type Stat = {
  name: string;
  defaultHidden?: boolean;
  create: (player: ScoreSaberPlayer) => ReactNode | undefined;
};

function statWithTooltip(tooltip: ReactNode, stat: ReactNode) {
  return (
    <SimpleTooltip display={tooltip} side="bottom" showOnMobile>
      {stat}
    </SimpleTooltip>
  );
}

const RANKED_VALUE_COLOR = "text-pp";

const playerStats: Stat[] = [
  {
    name: "Ranked Play Count",
    create: player => (
      <StatValue
        name="Ranked Play Count"
        value={formatNumberWithCommas(player.statistics.totalRankedScores)}
        size="lg"
        valueColor={RANKED_VALUE_COLOR}
      />
    ),
  },
  {
    name: "Total Ranked Score",
    create: player => (
      <StatValue
        name="Total Ranked Score"
        value={formatNumberWithCommas(player.statistics.totalRankedScore)}
        size="lg"
        valueColor={RANKED_VALUE_COLOR}
      />
    ),
  },
  {
    name: "Average Ranked Accuracy",
    create: player => (
      <StatValue
        name="Average Ranked Accuracy"
        value={`${player.statistics.averageRankedAccuracy.toFixed(2)}%`}
        size="lg"
        valueColor={RANKED_VALUE_COLOR}
      />
    ),
  },
  {
    name: "Total Play Count",
    create: player => (
      <StatValue
        name="Total Play Count"
        value={formatNumberWithCommas(player.statistics.totalScores)}
        size="lg"
      />
    ),
  },
  {
    name: "Total Score",
    create: player => (
      <StatValue name="Total Score" value={formatNumberWithCommas(player.statistics.totalScore)} size="lg" />
    ),
  },
  // {
  //   name: "Replays Watched by Others",
  //   create: player => (
  //     <StatValue
  //       name="Replays Watched by Others"
  //       value={formatNumberWithCommas(player.statistics.replaysWatched)}
  //       size="lg"
  //     />
  //   ),
  // },
  {
    name: "Joined Date",
    create: player =>
      statWithTooltip(
        <p>
          {formatDate(player.joinedDate, "DD MMMM YYYY HH:mm")} ({timeAgo(player.joinedDate)})
        </p>,
        <StatValue name="Joined Date" value={formatDate(player.joinedDate)} size="lg" />
      ),
  },
  {
    name: "Tracked Since",
    defaultHidden: true,
    create: player =>
      statWithTooltip(
        <p>
          {formatDate(player.trackedSince, "DD MMMM YYYY HH:mm")} ({timeAgo(player.trackedSince)})
        </p>,
        <StatValue name="Tracked Since" value={formatDate(player.trackedSince)} size="lg" />
      ),
  },
  {
    name: "Headset",
    defaultHidden: true,
    create: player => {
      if (player.hmd === undefined) {
        return undefined;
      }

      const hmd = getHMDInfo(player.hmd as HMD);

      return statWithTooltip(
        <div className="flex flex-col gap-1">
          <p className="mb-1">Percentage breakdown of headsets for all scores</p>
          {Object.entries(player.hmdBreakdown ?? {}).map(([hmdKey, percentage]) => (
            <div key={hmdKey} className="flex items-center gap-2">
              <HMDIcon hmd={getHMDInfo(hmdKey as HMD)} />
              <span>{hmdKey}</span>
              <span className="text-muted-foreground text-sm">{percentage.toFixed(2)}%</span>
            </div>
          ))}
        </div>,
        <StatValue
          name="Headset"
          value={
            <div className="flex items-center gap-1.5">
              <HMDIcon hmd={hmd} />
              <span>{player.hmd}</span>
            </div>
          }
          size="lg"
        />
      );
    },
  },
  {
    name: "Roles",
    create: player => {
      const roles = getScoreSaberRoles(player);
      if (roles.length === 0) {
        return undefined;
      }

      return statWithTooltip(
        <div className="flex flex-col gap-0.5">
          {roles.map(role => (
            <div key={role.roleId} className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: role.color }} />
              <span>{role.name}</span>
            </div>
          ))}
        </div>,
        <StatValue
          name="Roles"
          value={<p>{roles.map(role => role.shortName ?? role.name).join(", ")}</p>}
          size="lg"
        />
      );
    },
  },
  {
    name: "Peak Rank",
    defaultHidden: true,
    create: player => {
      if (player.peakRank === undefined) {
        return undefined;
      }

      return statWithTooltip(
        <p>
          {formatDate(player.peakRank.timestamp, "DD MMMM YYYY")} ({timeAgo(player.peakRank.timestamp)})
        </p>,
        <StatValue name="Peak Rank" value={`#${formatNumberWithCommas(player.peakRank.rank)}`} size="lg" />
      );
    },
  },
  {
    name: "+1 PP",
    defaultHidden: true,
    create: player =>
      statWithTooltip(
        <p>Amount of raw PP required to increase your global pp by 1pp</p>,
        <StatValue name="+1 PP" value={`${formatPp(player.plusOnePp)}pp`} size="lg" />
      ),
  },
];

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerStats({ player }: Props) {
  const [showMore, setShowMore] = useState(false);

  const hiddenStatCount = playerStats.filter(
    stat => stat.defaultHidden && stat.create(player) !== undefined
  ).length;

  const stats = playerStats.filter(stat => !stat.defaultHidden || showMore);

  return (
    <div className="flex w-full flex-wrap justify-center gap-2 lg:justify-start">
      {stats.map(stat => {
        const content = stat.create(player);
        if (content === undefined) {
          return undefined;
        }

        return <div key={`player-stat-${stat.name}`}>{content}</div>;
      })}

      {hiddenStatCount > 0 && (
        <button
          type="button"
          aria-expanded={showMore}
          onClick={() => setShowMore(current => !current)}
          className="border-border bg-background/90 text-muted-foreground hover:border-primary/50 hover:text-foreground flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors"
        >
          {showMore ? "Show less" : `Show ${hiddenStatCount} more`}
          {showMore ? <ChevronUp className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
        </button>
      )}
    </div>
  );
}
