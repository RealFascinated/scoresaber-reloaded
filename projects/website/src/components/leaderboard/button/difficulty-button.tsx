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
          `hover:text-foreground hover:border-border`,
          isSelected ? "font-semibold" : "font-medium"
        )}
        style={
          {
            backgroundColor: isSelected ? `${difficultyData.color}15` : "",
            "--hover-bg": `${difficultyData.color}15`,
          } as React.CSSProperties & { "--hover-bg": string }
        }
        onMouseEnter={e => {
          if (isSelected) {
            e.currentTarget.style.backgroundColor = `${difficultyData.color}30`;
          } else {
            e.currentTarget.style.backgroundColor = `${difficultyData.color}15`;
          }
        }}
        onMouseLeave={e => {
          if (isSelected) {
            e.currentTarget.style.backgroundColor = `${difficultyData.color}15`;
          } else {
            e.currentTarget.style.backgroundColor = "";
          }
        }}
      >
        <span style={{ color: difficultyData.color }}>{getDifficultyName(difficulty)}</span>
        {isSelected && (
          <div
            className="absolute rounded-md"
            style={{
              backgroundColor: difficultyData.color,
              top: "0",
              left: "-1px",
              right: "-1px",
              bottom: "-1px",
              mask: "linear-gradient(to bottom, transparent 0%, transparent calc(100% - 3px), black calc(100% - 3px), black 100%)",
              WebkitMask:
                "linear-gradient(to bottom, transparent 0%, transparent calc(100% - 3px), black calc(100% - 3px), black 100%)",
            }}
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
