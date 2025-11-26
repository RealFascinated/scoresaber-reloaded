"use client";

import { cn } from "@/common/utils";
import { Button } from "@/components/ui/button";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { PersonIcon } from "@radix-ui/react-icons";
import { TrendingUpIcon } from "lucide-react";
import { ReactElement, useState } from "react";

export type ScoreModeType = {
  name: string;
  id: ScoreModeEnum;
  icon: ReactElement<any>;
};

export enum ScoreModeEnum {
  Global = "global",
  Friends = "friend",
  History = "history",
}

export const scoreModes: ScoreModeType[] = [
  {
    name: "Global",
    id: ScoreModeEnum.Global,
    icon: <GlobeAmericasIcon className="h-4 w-4" />,
  },
  {
    name: "Friends",
    id: ScoreModeEnum.Friends,
    icon: <PersonIcon className="h-4 w-4" />,
  },
  {
    name: "History",
    id: ScoreModeEnum.History,
    icon: <TrendingUpIcon className="h-4 w-4" />,
  },
];

type ScoreModeProps = {
  initialMode?: ScoreModeEnum;
  onModeChange?: (mode: ScoreModeEnum) => void;
};

export default function ScoreMode({ initialMode, onModeChange }: ScoreModeProps) {
  const [selectedMode, setSelectedMode] = useState<ScoreModeEnum>(
    initialMode ?? ScoreModeEnum.Global
  );

  return (
    <div className="bg-background/80 border-border/50 flex gap-2 rounded-lg border p-1.5 shadow-sm">
      {scoreModes.map(mode => (
        <Button
          key={mode.name}
          variant={selectedMode === mode.id ? "default" : "ghost"}
          className={cn(
            "flex h-9 w-28 items-center gap-2 transition-all duration-200",
            selectedMode === mode.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "hover:bg-accent/80"
          )}
          onClick={() => {
            setSelectedMode(mode.id);
            if (onModeChange) {
              onModeChange(mode.id);
            }
          }}
        >
          <span
            className={cn(
              "transition-transform duration-200",
              selectedMode === mode.id ? "scale-110" : "scale-100"
            )}
          >
            {mode.icon}
          </span>
          <span className="font-medium">{mode.name}</span>
        </Button>
      ))}
    </div>
  );
}
