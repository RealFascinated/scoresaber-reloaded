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
  if (characteristic !== "Standard") return null;

  const isSelected = leaderboardId === selectedId;
  const difficultyData = getDifficulty(difficulty);
  const color = difficultyData.color;

  const button = (
    <Button
      variant={isSelected ? "default" : "ghost"}
      onClick={() => onSelect(leaderboardId)}
      className={cn(
        "hover:text-foreground px-4 py-2 transition-all duration-200",
        isSelected ? "font-semibold" : "font-medium"
      )}
    >
      <span style={{ color }}>{getDifficultyName(difficulty)}</span>
    </Button>
  );

  return inGameDifficulty ? (
    <SimpleTooltip display={inGameDifficulty}>{button}</SimpleTooltip>
  ) : (
    button
  );
}
