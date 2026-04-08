import { cn } from "@/common/utils";
import { Button } from "@/components/ui/button";
import { ScoreSaberLeaderboardDifficulty } from "@ssr/common/schemas/scoresaber/leaderboard/difficulty";
import { getDifficulty } from "@ssr/common/utils/song-utils";
import { StarIcon } from "lucide-react";
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

  const buttonId = `difficulty-btn-${id}`;
  return (
    <SimpleLink href={`/leaderboard/${id}`}>
      <style>{`
        #${buttonId}.difficulty-button-hover:hover {
          filter: brightness(1) !important;
        }
      `}</style>
      <Button
        id={buttonId}
        variant="ghost"
        className={cn(
          "difficulty-button-hover flex h-10 flex-col items-center justify-center rounded-b-none border-none px-(--spacing-md) py-(--spacing-sm) text-xs text-white transition-all duration-200",
          isSelected ? "font-bold" : ""
        )}
        style={{
          backgroundColor: color,
          filter: isSelected ? "brightness(1)" : "brightness(0.5)",
        }}
      >
        <span>{name}</span>
        {leaderboardDifficulty.stars > 0 && (
          <div className="flex items-center gap-1 text-xs">
            {leaderboardDifficulty.stars.toFixed(isMobile ? 1 : 2)}{" "}
            {!isMobile && <StarIcon className="size-3" />}
          </div>
        )}
      </Button>
    </SimpleLink>
  );
}
