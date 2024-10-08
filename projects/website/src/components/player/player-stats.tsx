import { formatNumberWithCommas } from "@/common/number-utils";
import StatValue from "@/components/stat-value";
import ScoreSaberPlayer from "@/common/model/player/impl/scoresaber-player";

type Badge = {
  name: string;
  color?: string;
  create: (player: ScoreSaberPlayer) => string | React.ReactNode | undefined;
};

const badges: Badge[] = [
  {
    name: "Ranked Play Count",
    color: "bg-pp",
    create: (player: ScoreSaberPlayer) => {
      return formatNumberWithCommas(player.statistics.rankedPlayCount);
    },
  },
  {
    name: "Total Ranked Score",
    color: "bg-pp",
    create: (player: ScoreSaberPlayer) => {
      return formatNumberWithCommas(player.statistics.totalRankedScore);
    },
  },
  {
    name: "Average Ranked Accuracy",
    color: "bg-pp",
    create: (player: ScoreSaberPlayer) => {
      return player.statistics.averageRankedAccuracy.toFixed(2) + "%";
    },
  },
  {
    name: "Total Play Count",
    create: (player: ScoreSaberPlayer) => {
      return formatNumberWithCommas(player.statistics.totalPlayCount);
    },
  },
  {
    name: "Total Score",
    create: (player: ScoreSaberPlayer) => {
      return formatNumberWithCommas(player.statistics.totalScore);
    },
  },
  {
    name: "Total Replays Watched",
    create: (player: ScoreSaberPlayer) => {
      return formatNumberWithCommas(player.statistics.replaysWatched);
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

        return <StatValue key={index} color={badge.color} name={badge.name} value={toRender} />;
      })}
    </div>
  );
}
