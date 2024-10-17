import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import StatValue from "@/components/stat-value";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatDate } from "@ssr/common/utils/time-utils";
import { ReactNode } from "react";
import Tooltip from "@/components/tooltip";

type Badge = {
  name: string;
  color?: string;
  create: (player: ScoreSaberPlayer) => {
    tooltip?: string | ReactNode;
    value: string | ReactNode;
  };
};

const badges: Badge[] = [
  {
    name: "Ranked Play Count",
    color: "bg-pp",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: formatNumberWithCommas(player.statistics.rankedPlayCount),
      };
    },
  },
  {
    name: "Total Ranked Score",
    color: "bg-pp",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: formatNumberWithCommas(player.statistics.totalRankedScore),
      };
    },
  },
  {
    name: "Average Ranked Accuracy",
    color: "bg-pp",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: player.statistics.averageRankedAccuracy.toFixed(2) + "%",
      };
    },
  },
  {
    name: "Total Play Count",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: formatNumberWithCommas(player.statistics.totalPlayCount),
      };
    },
  },
  {
    name: "Total Score",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: formatNumberWithCommas(player.statistics.totalScore),
      };
    },
  },
  {
    name: "Total Replays Watched",
    create: (player: ScoreSaberPlayer) => {
      return {
        value: formatNumberWithCommas(player.statistics.replaysWatched),
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
];

type Props = {
  player: ScoreSaberPlayer;
};

export default function PlayerStats({ player }: Props) {
  return (
    <div className={`flex flex-wrap gap-2 w-full justify-center lg:justify-start`}>
      {badges.map((badge, index) => {
        const toRender = badge.create(player);
        if (toRender === undefined) {
          return <div key={index} />;
        }
        const { tooltip, value } = toRender;
        const stat = <StatValue key={index} color={badge.color} name={badge.name} value={value} />;

        return tooltip ? (
          <Tooltip asChild={false} display={tooltip}>
            {stat}
          </Tooltip>
        ) : (
          stat
        );
      })}
    </div>
  );
}
