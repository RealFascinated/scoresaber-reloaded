import clsx from "clsx";
import React from "react";

/**
 * A badge to display in the score stats.
 */
export type ScoreBadge<TScore, TLeaderboard> = {
  name: string;
  color?: (score: TScore, leaderboard: TLeaderboard, medalsMode?: boolean) => string | undefined;
  create: (score: TScore, leaderboard: TLeaderboard, medalsMode?: boolean) => React.ReactNode | undefined;
};

/**
 * The badges to display in the score stats.
 */
type ScoreBadgeProps<TScore, TLeaderboard> = {
  badges: ScoreBadge<TScore, TLeaderboard>[];
  score: TScore;
  leaderboard: TLeaderboard;
  medalsMode?: boolean;
};

export function ScoreBadges<TScore, TLeaderboard>({
  badges,
  score,
  leaderboard,
  medalsMode,
}: ScoreBadgeProps<TScore, TLeaderboard>) {
  return badges.map((badge, index) => {
    const toRender = badge.create(score, leaderboard, medalsMode);
    const color = badge.color?.(score, leaderboard, medalsMode);
    if (toRender === undefined) {
      return <div key={index} />;
    }
    return (
      <div
        key={index}
        className={clsx(
          "flex h-full cursor-default items-center justify-center rounded-md p-1 text-sm",
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
