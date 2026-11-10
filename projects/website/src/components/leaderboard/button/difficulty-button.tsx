import { cn } from "@/common/utils";
import { Button } from "@/components/ui/button";
import { SharedIcons } from "@/shared-icons";
import { ScoreSaberLeaderboardDifficulty } from "@ssr/common/schemas/scoresaber/leaderboard/difficulty";
import { getDifficulty } from "@ssr/common/utils/song-utils";
import { CSSProperties } from "react";
import { useIsMobile } from "../../../contexts/viewport-context";
import SimpleLink from "../../simple-link";

type DifficultyButtonProps = {
  leaderboardDifficulty: ScoreSaberLeaderboardDifficulty;
  selectedId: number;
};

export function DifficultyButton({ leaderboardDifficulty, selectedId }: DifficultyButtonProps) {
  const isMobile = useIsMobile();

  const { difficulty, id } = leaderboardDifficulty;

  const isSelected = id === selectedId;
  const difficultyData = getDifficulty(difficulty);
  const color = difficultyData.color;
  const name = isMobile
    ? difficultyData.shortName
    : (difficultyData.displayName ?? difficultyData.mapDifficulty);

  return (
    <SimpleLink href={`/leaderboard/${id}`}>
      <Button
        variant="ghost"
        className={cn(
          "flex h-10 flex-col items-center justify-center rounded-b-none border-none px-(--spacing-md) py-(--spacing-sm) text-xs transition-all duration-200",
          isSelected
            ? "text-difficulty-foreground hover:text-difficulty-foreground font-bold"
            : "hover:bg-(--diff-hover)! hover:text-(--diff-color)"
        )}
        style={
          {
            // Selected: solid fill with dark text. Unselected: a tint with the difficulty color as text, so
            // the label stays readable instead of being dimmed along with the background.
            "--diff-color": color,
            "--diff-hover": `color-mix(in oklab, ${color} 30%, transparent)`,
            backgroundColor: isSelected ? color : `color-mix(in oklab, ${color} 16%, transparent)`,
            color: isSelected ? undefined : color,
          } as CSSProperties
        }
      >
        <span>{name}</span>
        {leaderboardDifficulty.stars > 0 && (
          <div className="flex items-center gap-1 text-xs">
            {leaderboardDifficulty.stars.toFixed(isMobile ? 1 : 2)}{" "}
            {!isMobile && <SharedIcons.DifficultyStarIcon className="size-3" />}
          </div>
        )}
      </Button>
    </SimpleLink>
  );
}
