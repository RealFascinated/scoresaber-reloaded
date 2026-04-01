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
  const { characteristic, difficulty, id } = leaderboardDifficulty;
  if (characteristic !== "Standard") {
    return null;
  }

  const isSelected = id === selectedId;
  const difficultyData = getDifficulty(difficulty);
  const color = difficultyData.color;

  const buttonId = `difficulty-btn-${id}`;
  return (
    <SimpleLink href={`/leaderboard/${id}`}>
      <style>{`
    @media (hover: hover) {
      #${buttonId}.difficulty-button-hover:hover {
        border-color: ${color} !important;
        background-color: ${color}00 !important;
      }
    }
  `}</style>
      <Button
        id={buttonId}
        variant="ghost"
        className={cn(
          "difficulty-button-hover px-(--spacing-lg) py-(--spacing-sm) transition-all duration-200",
          isSelected ? "font-bold" : ""
        )}
        style={{
          borderColor: isSelected ? color : undefined,
          backgroundColor: isSelected ? `color-mix(in srgb, ${color} 15%, transparent)` : undefined,
        }}
      >
        <span style={{ color }}>{getDifficultyName(difficulty)}</span>
      </Button>
    </SimpleLink>
  );
}
