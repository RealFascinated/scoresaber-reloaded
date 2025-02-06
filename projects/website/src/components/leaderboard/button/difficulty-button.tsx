import { cn } from "@/common/utils";
import { Button } from "@/components/ui/button";
import { MapDifficulty } from "@ssr/common/score/map-difficulty";
import { MapCharacteristic } from "@ssr/common/types/map-characteristic";
import { getDifficulty, getDifficultyName } from "@ssr/common/utils/song-utils";
import { memo } from "react";

export const DifficultyButton = memo(
  ({
    difficulty,
    characteristic,
    leaderboardId,
    selectedId,
    onSelect,
  }: {
    difficulty: MapDifficulty;
    characteristic: MapCharacteristic;
    leaderboardId: number;
    selectedId: number;
    onSelect: (id: number) => void;
  }) => {
    if (characteristic !== "Standard") return null;

    const isSelected = leaderboardId === selectedId;
    const difficultyData = getDifficulty(difficulty);

    return (
      <Button
        variant={isSelected ? "default" : "outline"}
        onClick={() => onSelect(leaderboardId)}
        className={cn("border bg-transparent", isSelected && "font-extrabold")}
        style={{
          color: isSelected ? "white" : difficultyData.color,
          borderColor: difficultyData.color,
          backgroundColor: isSelected ? difficultyData.color : "transparent",
        }}
      >
        <p>{getDifficultyName(difficulty)}</p>
      </Button>
    );
  }
);
