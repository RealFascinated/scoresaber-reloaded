import { cn } from "@/common/utils";
import { Button } from "@/components/ui/button";
import { ScoreSaberLeaderboardDifficulty } from "@ssr/common/schemas/scoresaber/leaderboard/difficulty";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import SimpleLink from "../../simple-link";

type DifficultyButtonProps = {
  leaderboardDifficulty: ScoreSaberLeaderboardDifficulty;
  selectedId: number;
};

export function DifficultyButton({ leaderboardDifficulty, selectedId }: DifficultyButtonProps) {
  const { difficulty, id } = leaderboardDifficulty;

  const isSelected = id === selectedId;
  const difficultyData = getDifficulty(difficulty);
  const color = difficultyData.color;

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
          "difficulty-button-hover rounded-b-none border-none px-(--spacing-lg) py-(--spacing-sm) text-white transition-all duration-200",
          isSelected ? "font-bold" : ""
        )}
        style={{
          backgroundColor: color,
          filter: isSelected ? "brightness(1)" : "brightness(0.5)",
        }}
      >
        <span>{getDifficultyName(difficulty)}</span>
      </Button>
    </SimpleLink>
  );
}
