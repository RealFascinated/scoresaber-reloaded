import { formatNumberWithCommas } from "@ssr/common/utils/number-utils";
import StatValue from "@/components/stat-value";
import ScoreSaberPlayer from "@ssr/common/player/impl/scoresaber-player";
import { formatDate } from "@ssr/common/utils/time-utils";
import { ReactNode } from "react";
import Tooltip from "@/components/tooltip";
import { getPlayerHistoryToday } from "@ssr/common/utils/player-utils";
import { DailyChange } from "@/components/statistic/daily-change";
import { PlayerStat } from "@ssr/common/player/player-stat";

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
      const history = getPlayerHistoryToday(player);
      const rankedScores = history.scores?.rankedScores;

      return {
        value: (
          <>
            {formatNumberWithCommas(player.statistics.rankedPlayCount)}{" "}
            <DailyChange type={PlayerStat.RankedPlayCount} change={rankedScores} />
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
      const history = getPlayerHistoryToday(player);
      const rankedScores = history.scores?.rankedScores;
      const unrankedScores = history.scores?.unrankedScores;
      const totalChange = (rankedScores ?? 0) + (unrankedScores ?? 0);

      return {
        value: (
          <>
            {formatNumberWithCommas(player.statistics.totalPlayCount)}{" "}
            <DailyChange type={PlayerStat.TotalPlayCount} change={totalChange} />
          </>
        ),
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
      {playerStats.map((badge, index) => {
        const toRender = badge.create(player);
        if (toRender === undefined) {
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
