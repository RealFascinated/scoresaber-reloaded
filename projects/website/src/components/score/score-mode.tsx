"use client";

import { ReactElement, useState } from "react";
import { GlobeAmericasIcon } from "@heroicons/react/24/solid";
import { PersonIcon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";

export type ScoreModeType = {
  name: ScoreModeEnum;
  icon: ReactElement;
};

export enum ScoreModeEnum {
  Global = "Global",
  Friends = "Friend",
}

export const scoreModes: ScoreModeType[] = [
  {
    name: ScoreModeEnum.Global,
    icon: <GlobeAmericasIcon className="w-4 h-4" />,
  },
  {
    name: ScoreModeEnum.Friends,
    icon: <PersonIcon className="w-4 h-4" />,
  },
];

type ScoreModeProps = {
  onModeChange?: (mode: ScoreModeEnum) => void;
};

export default function ScoreMode({ onModeChange }: ScoreModeProps) {
  const [selectedMode, setSelectedMode] = useState<ScoreModeEnum>(ScoreModeEnum.Global);

  return (
    <div className="flex gap-2">
      {scoreModes.map(mode => (
        <Button
          key={mode.name}
          variant={selectedMode === mode.name ? "default" : "outline"}
          className="flex items-center gap-1"
          onClick={() => {
            setSelectedMode(mode.name);
            onModeChange && onModeChange(mode.name);
          }}
        >
          {mode.icon}
          {mode.name}
        </Button>
      ))}
    </div>
  );
}
