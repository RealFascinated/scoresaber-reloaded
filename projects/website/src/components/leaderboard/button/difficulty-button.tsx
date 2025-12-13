import { cn } from "@/common/utils";
import SimpleTooltip from "@/components/simple-tooltip";
import { Button } from "@/components/ui/button";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";

type DifficultyButtonProps = {
  difficulty: MapDifficulty;
  characteristic: MapCharacteristic;
  leaderboardId: number;
  selectedId: number;
  inGameDifficulty: string | undefined;
  onSelect: (leaderboardId: number) => void;
};

export function DifficultyButton({
  difficulty,
  characteristic,
  leaderboardId,
  selectedId,
  inGameDifficulty,
  onSelect,
}: DifficultyButtonProps) {
  if (characteristic !== "Standard") {
    return null;
  }

  const isSelected = leaderboardId === selectedId;
  const difficultyData = getDifficulty(difficulty);
  const color = difficultyData.color;

  const buttonId = `difficulty-btn-${leaderboardId}`;
  const button = (
    <>
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
        onClick={() => onSelect(leaderboardId)}
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
    </>
  );

  return inGameDifficulty ? <SimpleTooltip display={inGameDifficulty}>{button}</SimpleTooltip> : button;
}
