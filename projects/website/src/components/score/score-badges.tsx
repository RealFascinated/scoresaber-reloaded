import clsx from "clsx";
import React from "react";

/**
 * A badge to display in the score stats.
 */
export type ScoreBadge<TScore, TLeaderboard> = {
  name: string;
  color?: (score: TScore, leaderboard: TLeaderboard) => string | undefined;
  create: (score: TScore, leaderboard: TLeaderboard) => React.ReactNode | undefined;
};

/**
 * The badges to display in the score stats.
 */
type ScoreBadgeProps<TScore, TLeaderboard> = {
  badges: ScoreBadge<TScore, TLeaderboard>[];
  score: TScore;
  leaderboard: TLeaderboard;
};

export function ScoreBadges<TScore, TLeaderboard>({
  badges,
  score,
  leaderboard,
}: ScoreBadgeProps<TScore, TLeaderboard>) {
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
