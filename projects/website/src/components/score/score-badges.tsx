import clsx from "clsx";
import React from "react";

export type ScoreBadge<TScore, TLeaderboard> = {
  name: string;
  /**
   * Tints the whole badge. Reserved for badges whose color carries a meaning (the accuracy tier).
   */
  color?: (score: TScore, leaderboard: TLeaderboard, medalsMode?: boolean) => string | undefined;
  /**
   * Colors only the badge's text, for badges that have a fixed identity color (pp, left/right hand).
   */
  textColor?: (score: TScore, leaderboard: TLeaderboard, medalsMode?: boolean) => string | undefined;
  create: (score: TScore, leaderboard: TLeaderboard, medalsMode?: boolean) => React.ReactNode | undefined;
};

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
    const textColor = badge.textColor?.(score, leaderboard, medalsMode);
    const key = badge.name + String(index);
    if (toRender === undefined) {
      return <div key={key} />;
    }
    return (
      <div
        key={key}
        className={clsx(
          "flex h-full cursor-default items-center justify-center rounded-md p-1 text-sm font-medium tabular-nums ring-1 ring-inset",
          !color && "bg-accent/60 ring-border"
        )}
        style={
          color
            ? ({
                // Tint the badge with its color instead of filling it, so rows stay calm to scan
                backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)`,
                "--tw-ring-color": `color-mix(in oklab, ${color} 50%, transparent)`,
              } as React.CSSProperties)
            : { color: textColor }
        }
      >
        {toRender}
      </div>
    );
  });
}
