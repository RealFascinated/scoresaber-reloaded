import { ScoreSaberScore } from "@ssr/common/model/score/impl/scoresaber-score";
import ScoreSaberLeaderboard from "@ssr/common/model/leaderboard/impl/scoresaber-leaderboard";
import clsx from "clsx";

/**
 * A badge to display in the score stats.
 */
export type ScoreBadge = {
  name: string;
  color?: (score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard) => string | undefined;
  create: (score: ScoreSaberScore, leaderboard: ScoreSaberLeaderboard) => string | React.ReactNode | undefined;
};

/**
 * The badges to display in the score stats.
 */
type ScoreBadgeProps = {
  badges: ScoreBadge[];
  score: ScoreSaberScore;
  leaderboard: ScoreSaberLeaderboard;
};

export function ScoreBadges({ badges, score, leaderboard }: ScoreBadgeProps) {
  return badges.map((badge, index) => {
    const toRender = badge.create(score, leaderboard);
    const color = badge.color?.(score, leaderboard);
    if (toRender === undefined) {
      return <div key={index} />;
    }
    return (
      <div
        key={index}
        className={clsx(
          "flex h-fit p-1 items-center justify-center rounded-md text-sm cursor-default",
          color ? color : "bg-accent"
        )}
        style={{
          backgroundColor: (!color?.includes("bg") && color) || undefined,
        }}
      >
        {toRender}
      </div>
    );
  });
}
