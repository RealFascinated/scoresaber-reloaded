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
  color: string;
  hoverColor: string;
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
    color: "bg-primary/15 border-primary text-primary",
    hoverColor: "hover:border-primary hover:text-primary",
    icon: <GlobeAmericasIcon className="h-4 w-4" />,
  },
  {
    name: "Friends",
    id: ScoreModeEnum.Friends,
    color: "bg-friends/15 border-friends text-friends",
    hoverColor: "hover:border-friends hover:text-friends",
    icon: <PersonIcon className="h-4 w-4" />,
  },
  {
    name: "History",
    id: ScoreModeEnum.History,
    color: "bg-history/15 border-history text-history",
    hoverColor: "hover:border-history hover:text-history",
    icon: <TrendingUpIcon className="h-4 w-4" />,
  },
];

type ScoreModeProps = {
  initialMode?: ScoreModeEnum;
  onModeChange?: (mode: ScoreModeEnum) => void;
};

export default function ScoreModeSwitcher({ initialMode, onModeChange }: ScoreModeProps) {
  const [selectedMode, setSelectedMode] = useState<ScoreModeEnum>(initialMode ?? ScoreModeEnum.Global);

  return (
    <div className="flex flex-wrap items-center justify-center gap-(--spacing-sm)">
      {scoreModes.map(mode => (
        <Button
          key={mode.name}
          variant={selectedMode === mode.id ? "default" : "ghost"}
          className={cn(
            "flex items-center gap-2 px-(--spacing-lg) py-(--spacing-sm) transition-all duration-200",
            mode.hoverColor,
            selectedMode === mode.id ? `${mode.color} font-bold` : "hover:bg-accent/80"
          )}
          onClick={() => {
            setSelectedMode(mode.id);
            if (onModeChange) {
              onModeChange(mode.id);
            }
          }}
        >
          <span>{mode.icon}</span>
          <span>{mode.name}</span>
        </Button>
      ))}
    </div>
  );
}
