import { cn } from "@/common/utils";
import SimpleTooltip from "@/components/simple-tooltip";
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
    inGameDifficulty,
    onSelect,
  }: {
    difficulty: MapDifficulty;
    characteristic: MapCharacteristic;
    leaderboardId: number;
    selectedId: number;
    inGameDifficulty?: string;
    onSelect: (id: number) => void;
  }) => {
    if (characteristic !== "Standard") return null;

    const isSelected = leaderboardId === selectedId;
    const difficultyData = getDifficulty(difficulty);

    const button = (
      <Button
        variant="ghost"
        onClick={() => onSelect(leaderboardId)}
        className={cn(
          "relative px-4 py-2 transition-all duration-200",
          "hover:bg-accent/50",
          isSelected ? "font-semibold" : "font-medium"
        )}
        style={{
          backgroundColor: isSelected ? `${difficultyData.color}15` : "",
        }}
      >
        <span style={{ color: difficultyData.color }}>{getDifficultyName(difficulty)}</span>
        {isSelected && (
          <div
            className="absolute right-0 bottom-0 left-0 h-0.5"
            style={{ backgroundColor: difficultyData.color }}
          />
        )}
      </Button>
    );

    return inGameDifficulty ? (
      <SimpleTooltip display={inGameDifficulty}>{button}</SimpleTooltip>
    ) : (
      button
    );
  }
);

// Add display name for the component
DifficultyButton.displayName = "DifficultyButton";
