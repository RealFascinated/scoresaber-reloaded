import { formatNumberWithCommas } from "@/common/number-utils";
import StatValue from "@/components/stat-value";
import ScoreSaberPlayerToken from "@/common/model/token/scoresaber/score-saber-player-token";

type Badge = {
  name: string;
  color?: string;
  create: (
    player: ScoreSaberPlayerToken,
  ) => string | React.ReactNode | undefined;
};

const badges: Badge[] = [
  {
    name: "Ranked Play Count",
    color: "bg-pp",
    create: (player: ScoreSaberPlayerToken) => {
      return formatNumberWithCommas(player.scoreStats.rankedPlayCount);
    },
  },
  {
    name: "Total Ranked Score",
    color: "bg-pp",
    create: (player: ScoreSaberPlayerToken) => {
      return formatNumberWithCommas(player.scoreStats.totalRankedScore);
    },
  },
  {
    name: "Average Ranked Accuracy",
    color: "bg-pp",
    create: (player: ScoreSaberPlayerToken) => {
      return player.scoreStats.averageRankedAccuracy.toFixed(2) + "%";
    },
  },
  {
    name: "Total Play Count",
    create: (player: ScoreSaberPlayerToken) => {
      return formatNumberWithCommas(player.scoreStats.totalPlayCount);
    },
  },
  {
    name: "Total Score",
    create: (player: ScoreSaberPlayerToken) => {
      return formatNumberWithCommas(player.scoreStats.totalScore);
    },
  },
  {
    name: "Total Replays Watched",
    create: (player: ScoreSaberPlayerToken) => {
      return formatNumberWithCommas(player.scoreStats.replaysWatched);
    },
  },
];

type Props = {
  player: ScoreSaberPlayerToken;
};

export default function PlayerStats({ player }: Props) {
  return (
    <div
      className={`flex flex-wrap gap-2 w-full justify-center lg:justify-start`}
    >
      {badges.map((badge, index) => {
        const toRender = badge.create(player);
        if (toRender === undefined) {
          return <div key={index} />;
        }

        return (
          <StatValue
            key={index}
            color={badge.color}
            name={badge.name}
            value={toRender}
          />
        );
      })}
    </div>
  );
}
